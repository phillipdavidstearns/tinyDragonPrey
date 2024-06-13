#!/usr/bin/env python3

import os
import sys
import socket
import pyaudio
import re
from threading import Thread, Lock
from time import sleep
import logging

# temporary fix to exclude characters that might mess up the console output.
# https://www.asciitable.com/
# https://serverfault.com/questions/189520/which-characters-if-catd-will-mess-up-my-terminal-and-make-a-ton-of-noise

excludedChars=[1,2,3,4,5,6,7,8,9,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,155,255]

#===========================================================================
# Dragon
# Manages the trio of packet sniffer, data printer, and audifier

class Dragon(Thread):
  def __init__(self, INTERFACES='eth0', CHUNK=1024, PRINT=False, COLOR=False, CONTROL_CHARACTERS=True, DEVICE=0, RATE=44100, WIDTH=1, LOGAPS=True):
    if os.getuid() != 0:
      raise Exception('This module requires root priviledges.')
    super().__init__()
    self.daemon = True
    self.interfaces = []
    ifs = re.split(r'[:;,\.\-_\+|]', INTERFACES)
    for i in range(len(ifs)) :
      self.interfaces.append(ifs[i])
    self.qtyChannels = len(self.interfaces)
    self.sockets = None
    self.writer = None
    self.audifier = None
    self.audioDevice=DEVICE
    self.chunk = CHUNK
    self.rate = RATE
    self.width = WIDTH
    self.printEnabled = PRINT
    self.colorEnabled = COLOR
    self.ctlEnabled = CONTROL_CHARACTERS
    self.logAPs = LOGAPS
    self.doRun = False
    self.isStopped = True
    self.isReady = False

    logging.debug("DEVICE: %s" % self.audioDevice)
    logging.debug("interfaces: %s" % self.interfaces)
    logging.debug("qtyChannels: %s" % self.qtyChannels)
    logging.debug("CHUNK SIZE: %s" %  self.chunk)
    logging.debug("SAMPLE RATE: %s" % self.rate)
    logging.debug("BYTES PER SAMPLE: %s" % self.width)
    logging.debug("PRINT: %s" % self.printEnabled)
    logging.debug("COLOR: %s" % self.colorEnabled)
    logging.debug("CONTROL_CHARACTERS: %s" % self.ctlEnabled)
    logging.debug("LOG APs: %s" % self.logAPs)

  def audify_data_callback(self, in_data, frame_count, time_info, status):
    audioChunk, printQueue = self.sockets.extractFrames(frame_count)
    self.writer.queueForPrinting(printQueue)
    return(bytes(audioChunk), pyaudio.paContinue)

  def run(self):
    self.doRun = True

    try:
      self.sockets = Listener(self.interfaces)
      self.sockets.start()
    except Exception as e:
      logging.error(f'Error starting socket listeners: {repr(e)}')

    try:
      self.writer = Writer(
        qtyChannels=self.qtyChannels,
        chunkSize=self.chunk * self.qtyChannels,
        color=self.colorEnabled,
        linebreaks=self.ctlEnabled,
        enabled=self.printEnabled
      )
      self.writer.start()
    except Exception as e:
      logging.error(f'Error starting console writers: {repr(e)}')

    try:
      self.audifier = Audifier(
        qtyChannels=self.qtyChannels,
        width=self.width,
        rate=self.rate,
        chunkSize=self.chunk,
        deviceIndex=self.audioDevice,
        callback=self.audify_data_callback
      )
      self.audifier.start()
    except Exception as e:
      logging.error(f'Error starting audifiers: {prer(e)}')

    self.isStopped = False
    self.isReady = True
  
    while self.doRun:
        sleep(0.1)

    self.isStopped = True

  def stop(self):
    self.doRun = False

    while not self.isStopped:
      sleep(0.1)

    logging.info('Stopping Writer...')
    try:
      if self.writer.isColorEnabled():
        self.writer.stop()
        sys.stdout.write('\x1b[0m')
      self.writer.stop()
    except Exception as e:
      logging.error(f"Error stopping Writer: {repr(e)}")

    # Shutdown the PyAudio instance
    logging.info('Stopping audio stream...')
    try:
      self.audifier.stop()
    except Exception as e:
      logging.error(f"Failed to terminate PyAudio instance: {repr(e)}")

    # close the sockets
    logging.info('Closing Listener...')
    try:
      self.sockets.stop()
    except Exception as e:
      logging.error(f"Error closing socket: {repr(e)}")

    logging.info('The Dragon Sleeps!')
    self.join()

  def get_writer_state(self):
    return self.writer.getState()

#===========================================================================
# Listener
# A socket based packet sniffer. Main loop will check sockets for data and grab what's there,
# storing in a buffer to be extracted later. chunkSize should be a relatively small power of two.
# Until I can figure out a way to tinker with the sockets and set appropriate permissions, this
# is what requires running the script as root.

class Listener(Thread):
  def __init__(self, interfaces, chunkSize=4096, logAPs=True):
    super().__init__()
    self.daemon = True
    self._lock=Lock()
    self._interfaces = interfaces
    self._chunkSize = chunkSize # used to fine tune how much is "grabbed" from the socket
    self._sockets = self._initSockets()
    self._buffers = self._initBuffers()
    self._doRun = False # flag to run main loop & help w/ smooth shutdown of thread
    self._APs = {}
    self._logAPs=logAPs

  def _initSockets(self):
    self._sockets = []
    for interface in self._interfaces:
      # etablishes a RAW socket on the given interface, e.g. eth0. meant to only be read.
      s = socket.socket(socket.AF_PACKET, socket.SOCK_RAW, socket.ntohs(0x0003))
      s.bind((interface, 0))
      s.setblocking(False) # non-blocking
      self._sockets.append(s)
    return self._sockets

  def _initBuffers(self):
    self._buffers = []
    for interface in self._interfaces :
      self._buffers.append(bytearray())
    return self._buffers

  def _analyzePacket(self, pkt):
    AP = {}
    SSID = None
    MAC = None
    try:
      if pkt[25] >> 4 & 0b1111 == 0x4 and pkt[25] >> 2 & 0b11 ==0:
        if pkt[49] == 0 and pkt[50] > 0:
          try:
            SSID=pkt[51:51+pkt[50]].decode('utf-8')
            MAC=pkt[29:35].hex()
          except:
            pass
        if not SSID and pkt[54] == 0 and pkt[55] > 0:
          try:
            SSID=pkt[56:56+pkt[55]].decode('utf-8')
            MAC=pkt[29:35].hex()
          except:
            pass
        if SSID:
          return {SSID: {"MAC": MAC}}  
      else:
        return None
    except:
      return None

  def _addToAPs(self, AP):
    for key in AP.keys():
      if not key in self._APs:
        self._APs[key] = {}
        self._APs[key]['MACs'] = [AP[key]['MAC']]
        self._APs[key]['count'] = 1
      else:
        if not AP[key]['MAC'] in self._APs[key]['MACs']:
          self._APs[key]['MACs'].append(AP[key]['MAC'])
        self._APs[key]['count'] += 1

  def _readSockets(self):
    for i in range(len(self._sockets)):
      try: # grab a chunk of data from the socket...
        if data := self._sockets[i].recv(65535):
          if self._interfaces[i] == 'wlan1' and self._logAPs:
            if AP := self._analyzePacket(data): # extract APs
              self._addToAPs(AP)
          self._buffers[i] += data # if there's any data there, add it to the buffer
      except: # if there's definitely no data to be read. the socket will throw and exception
        pass

  def extractFrames(self, frames):
    slices = [] # for making the chunk of audio data
    printQueue = [] # for assembling the data into chunks for printing  
    with self._lock:
      for n in range(len(self._buffers)):
        bufferSlice = self._buffers[n][:frames] # grab a slice of data from the buffer
        printQueue.append(bufferSlice) # whatever we got, add it to the print queue. no need to pad
        # this makes sure we return as many frames as requested, by padding with audio "0"
        padded = bufferSlice + bytes([127]) * (frames - len(bufferSlice))
        slices.append(padded)
        self._buffers[n] = self._buffers[n][frames:] # remove the extracted data from the buffer
      if len(self._buffers) == 2 : # interleave the slices to form a stereo chunk
        audioChunk = [ x for y in zip(slices[0], slices[1]) for x in y ]
      elif len(self._buffers) == 1: # marvelous mono
        audioChunk = slices[0]
      else:
        raise Exception("[!] Only supports 1 or two channels/interfaces.")
    return audioChunk, printQueue

  def getAPs(self):
    with self._lock:
      return self._APs.copy()

  def isRunning(self):
    return not self._doRun

  def run(self):
    logging.info('[LISTENER] run()')
    self._doRun=True
    while self._doRun:
      try:
        self._readSockets()
        sleep(0.0001)
      except Exception as e:
        logging.error(f'[LISTENER] Error executing readSockets(): {repr(e)}')

  def stop(self):
    logging.info('[LISTENER] stop()')
    self._doRun=False
    try:
      for socket in self._sockets:
        socket.close()
    except Exception as e:
      logging.error(f'While closing socket: {repr(e)}')
    self.join()

#===========================================================================
# Writer
# Handles console print operations in an independent thread. To prevent backlog of print data,
# The chunkSize should be set to the same value as for the audio device. Right now, this is done
# in the initialization portion of the script when run as standalone.

class Writer(Thread):
  def __init__(self, qtyChannels=1, chunkSize=256, color=False, linebreaks=True, enabled=False):
    super().__init__()
    self.daemon = True
    self._lock=Lock()
    self._qtyChannels = qtyChannels # we need to know how many streams of data we'll be printing
    self._doRun = False
    self._color=color
    self._linebreaks=linebreaks
    self._shift = 0
    self._enabled = enabled
    self._chunkSize = chunkSize
    self._buffers = self._initBuffers() # the so called printQueue

  def _initBuffers(self):
    self._buffers = []
    for i in range(self._qtyChannels):
      self._buffers.append(bytearray())
    return self._buffers

  def queueForPrinting(self, queueData):
    # this thread isn't actively grabbing data, it's added here...
    if not self._enabled:
      return

    with self._lock:
      if len(queueData) != len(self._buffers):
        raise Exception(f"[!] len(queueData): {len(queueData)} != len(self.buffers): {len(self._buffers)}")
      for i in range(len(self._buffers)):
        if queueData[i]:
            self._buffers[i] += queueData[i]

  def _printBuffers(self):
    if not self._enabled:
      return

    for n in range(len(self._buffers)):
      string = ''

      if self._chunkSize > len(self._buffers[n]):
        size = len(self._buffers[n])
      else:
        size = self._chunkSize

      if size > 0:
        for i in range(size):
          char=chr(0)
          val = self._buffers[n][i]
          
          if self._linebreaks:
            TEST = True
          else:
            TEST = val > 31
          
          if TEST and not val in excludedChars:
            char = chr(val)

          if self._color: # add the ANSI escape sequence to encode the background color to value of val
            color = (val + self._shift + 256) % 256 # if we want to specify some amount of color shift...
            string += f'\x1b[48;5;{int(color)}m{char}'
          else:
            string += char

        if self._color:
          string += '\x1b[0m'

        sys.stdout.write(string)
        sys.stdout.flush()

        self._buffers[n] = self._buffers[n][size:] # remove chunk from queue. will enmpty over time if disabled

  def getState(self):
    with self._lock:
      return {
        'enabled': self._enabled,
        'color': self._color,
        'linebreaks': self._linebreaks,
        'shift': self._shift,
      }

  def printEnable(self, value):
    with self._lock:
      if value:
        self._enabled = True
      else:
        self._enabled = False
        self._initBuffers()

  def colorEnable(self, value):
    with self._lock:
      if value:
        self._color = True
      else:
        self._color = False

  def isColorEnabled(self, value):
    with self._lock:
      return self._color

  def ctlCharactersEnable(self, value):
    with self._lock:
      if value:
        self._linebreaks = True
      else:
        self._linebreaks = False

  def setColorShift(self, value):
    with self._lock:
      try:
        value = int(value)
      except:
        value = 0
      self._shift = value

  def isRunning(self):
    with self._lock:
      return not self._doRun

  def run(self):
    logging.info('[WRITER] run()')
    self._doRun = True
    while self._doRun:
      try:
        self._printBuffers()
        sleep(0.001)
      except Exception as e:
        logging.error(f'[WRITER] Error while executing printBuffers(): {repr(e)}')
        self.stop()

  def stop(self):
    logging.info('[WRITER] stop()')
    self._doRun = False
    os.system('reset')
    self.join()

#===========================================================================
# Audifer
# PyAudio stream instance and operations. By default pyAudio opens the stream in its own thread.
# Callback mode is used. Documentation for PyAudio states the process
# for playback runs in a separate thread. Initializing in a subclassed Thread may be redundant.

class Audifier():
  def __init__(self, qtyChannels=1, width=1, rate=44100, chunkSize=2048, deviceIndex=0, callback=None):
    if not callback:
      raise Exception(f'Audifier instance requires a callback function. Got: {repr(callback)}')

    self._qtyChannels = qtyChannels
    self._width = width
    self._rate = rate
    self._chunkSize = chunkSize
    self._deviceIndex = deviceIndex
    self._callback = callback
    self._pa = pyaudio.PyAudio()
    self._stream = self._initPyAudioStream()

  def _initPyAudioStream(self):

    # These are here for debugging purposes...
    # for some reason, HDMI output eludes me.
    # print('format:', self.pa.get_format_from_width(self.width))
    
    # print(
    #   self.pa.is_format_supported(
    #     rate = self.rate,
    #     output_device=self.deviceIndex,
    #     output_channels=self.qtyChannels,
    #     output_format=self.pa.get_format_from_width(self.width)
    #   )
    # )

    self._stream = self._pa.open(
      format=self._pa.get_format_from_width(self._width),
      channels=self._qtyChannels,
      rate=self._rate,
      frames_per_buffer=self._chunkSize,
      input=False,
      output_device_index=self._deviceIndex,
      output=True,
      stream_callback=self._callback,
      start=False
    )
    return self._stream

  def isRunning(self):
    return self._stream.is_active()

  def start(self):
    logging.info('[AUDIFIER] run()')
    logging.debug("Starting audio stream...")
    self._stream.start_stream()
    if self._stream.is_active():
      logging.debug("Audio stream is active.")

  def stop(self):
    logging.info('[AUDIFIER] stop()')
    self._stream.close()
    self._pa.terminate()
