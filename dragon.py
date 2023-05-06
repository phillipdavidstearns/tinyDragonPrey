#!/usr/bin/env python3

import os
import sys
import socket
import pyaudio
import re
from threading import Thread, Lock
from time import sleep
from decouple import config
from logging import getLogger
import subprocess

# temporary fix to exclude characters that might mess up the console output.
# https://www.asciitable.com/
# https://serverfault.com/questions/189520/which-characters-if-catd-will-mess-up-my-terminal-and-make-a-ton-of-noise
excludedChars=[1,2,3,4,5,6,7,8,9,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,155,255]

#===========================================================================
# Listener
# A socket based packet sniffer. Main loop will check sockets for data and grab what's there,
# storing in a buffer to be extracted later. chunkSize should be a relatively small power of two.
# Until I can figure out a way to tinker with the sockets and set appropriate permissions, this
# is what requires running the script as root.

class Dragon(Thread):
  def __init__(self, INTERFACES, CHUNK=1024, PRINT=False, COLOR=False, CONTROL_CHARACTERS=True, DEVICE=0, RATE=44100, WIDTH=1, LOGAPS=True):

    if os.getuid() != 0:
      raise Exception('This module requires root priviledges.')

    self.interfaces = []
    ifs = re.split(r'[:;,\.\-_\+|]', INTERFACES)
    for i in range(len(ifs)) :
      self.interfaces.append(ifs[i])
    self.qtyChannels = len(self.interfaces)
    self.lock=Lock()
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
    Thread.__init__(self)

    print("interfaces: ", self.interfaces)
    print("qtyChannels: ", self.qtyChannels)
    print("CHUNK SIZE:",  self.chunk)
    print("SAMPLE RATE:", self.rate)
    print("BYTES PER SAMPLE:", self.width)
    print("PRINT:", self.printEnabled)
    print("COLOR:", self.colorEnabled)
    print("CONTROL_CHARACTERS:", self.ctlEnabled)
    print('LOG APs:', self.logAPs)

  def audify_data_callback(self, in_data, frame_count, time_info, status):
    with self.lock:
      audioChunk, printQueue = self.sockets.extractFrames(frame_count)
      self.writer.queueForPrinting(printQueue)
    return(bytes(audioChunk), pyaudio.paContinue)

  def run(self):
    self.doRun = True
    try:
      self.sockets = Listener(self.interfaces)
      self.sockets.start()
    except Exception as e:
      print('Error starting socket listeners:',e)

    try:
      self.writer = Writer(
        self.qtyChannels,
        self.chunk*self.qtyChannels,
        color=self.colorEnabled,
        control_characters=self.ctlEnabled,
        enabled=self.printEnabled
      )
      self.writer.start()
    except Exception as e:
      print('Error starting console writers:',e)

    # spin up the audio playback engine
    try:
      self.audifier = Audifier(
        self.qtyChannels,
        self.width,
        self.rate,
        self.chunk,
        self.audioDevice,
        callback=self.audify_data_callback
      )
      self.audifier.start()
    except Exception as e:
      print('Error starting audifiers:',e)

    self.isStopped = False
    while self.doRun:
        sleep(0.1)
    self.isStopped = True

  def stop(self):
    self.doRun = False

    while not self.isStopped:
      sleep(0.01)

    try:
      print('Stopping Writer...')
      if self.writer.color:
        self.writer.stop()
        print('\x1b[0m',end='')
      self.writer.stop()
    except Exception as e:
      print("Error stopping Writer:",e)

    # Shutdown the PyAudio instance
    print('Stopping audio stream...')
    try:
      self.audifier.stop()
    except Exception as e:
      print("Failed to terminate PyAudio instance:",e)

    # close the sockets
    print('Closing Listener...')
    try:
      self.sockets.stop()
    except Exception as e:
      print("Error closing socket:",e)

    print('The Dragon Sleeps!')
    self.join()

class Listener(Thread):
  def __init__(self, interfaces, chunkSize=4096, logAPs=True):
    self.lock=Lock()
    self.interfaces = interfaces
    self.chunkSize = chunkSize # used to fine tune how much is "grabbed" from the socket
    self.sockets = self.initSockets()
    self.buffers = self.initBuffers() # data will be into and out of the buffer(s)
    self.doRun = False # flag to run main loop & help w/ smooth shutdown of thread
    self.APs = {}
    self.logAPs=logAPs
    Thread.__init__(self)

  def initSockets(self):
    sockets = []
    for interface in self.interfaces:
      # etablishes a RAW socket on the given interface, e.g. eth0. meant to only be read.
      s = socket.socket(socket.AF_PACKET, socket.SOCK_RAW, socket.ntohs(0x0003))
      s.bind((interface,0))
      s.setblocking(False) # non-blocking
      sockets.append(s)
    return sockets

  def initBuffers(self):
    # nothing up my sleeves here...
    buffers = []
    for interface in self.interfaces :
      buffers.append(bytearray())
    return buffers

  def getAPs(self):
    with self.lock:
      return self.APs.copy()

  def analyzePacket(self, pkt):
    AP = {}
    SSID=None
    MAC=None
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
          return { SSID : { "MAC" : MAC } }  
      else:
        return None
    except:
      return None
      pass

  def addToAPs(self, AP):
    with self.lock:
      for key in AP.keys():
        if not key in self.APs:
          self.APs[key] = {}
          self.APs[key]['MACs'] = [AP[key]['MAC']]
          self.APs[key]['count'] = 1
        else:
          if not AP[key]['MAC'] in self.APs[key]['MACs']:
            self.APs[key]['MACs'].append(AP[key]['MAC'])
          self.APs[key]['count'] += 1

  def readSockets(self):
    for i in range(len(self.sockets)):
      try: # grab a chunk of data from the socket...
        data = self.sockets[i].recv(65535)
        if data:
          if self.interfaces[i] == 'wlan1' and self.logAPs:
            AP = self.analyzePacket(data) # extract APs from 
            if AP:
              self.addToAPs(AP)
          with self.lock:
            self.buffers[i] += data # if there's any data there, add it to the buffer
      except : # if there's definitely no data to be read. the socket will throw and exception
        pass

  def extractFrames(self, frames):
    with self.lock:
      # places to put stuff...
      slices = [] # for making the chunk of audio data
      printQueue = [] # for assembling the data into chunks for printing
      for n in range(len(self.buffers)):
        bufferSlice = self.buffers[n][:frames] # grab a slice of data from the buffer
        printQueue.append(bufferSlice) # whatever we got, add it to the print queue. no need to pad
        # this makes sure we return as many frames as requested, by padding with audio "0"
        padded = bufferSlice + bytes([127]) * (frames - len(bufferSlice))
        slices.append(padded)
        self.buffers[n] = self.buffers[n][frames:] # remove the extracted data from the buffer
      if len(self.buffers) == 2 : # interleave the slices to form a stereo chunk
        audioChunk = [ x for y in zip(slices[0], slices[1]) for x in y ]
      elif len(self.buffers) == 1: # marvelous mono
        audioChunk = slices[0]
      else:
        raise Exception("[!] Only supports 1 or two channels/interfaces.")
    return audioChunk, printQueue

  def run(self):
    print('[LISTENER] run()')
    self.doRun=True
    while self.doRun:
      try:
        self.readSockets()
        sleep(0.0001)
      except Exception as e:
        print('[LISTENER] Error: %s' % repr(e))

  def stop(self):
    print('[LISTENER] stop()')
    self.doRun=False
    for socket in self.sockets:
      socket.close()
    self.join()

#===========================================================================
# Writer
# Handles console print operations in an independent thread. To prevent backlog of print data,
# The chunkSize should be set to the same value as for the audio device. Right now, this is done
# in the initialization portion of the script when run as standalone.

class Writer(Thread):
  def __init__(self, qtyChannels, chunkSize=4096, color=False, control_characters=True, enabled=False):
    self.lock=Lock()
    self.qtyChannels = qtyChannels # we need to know how many streams of data we'll be printing
    self.doRun = False
    self.color=color
    self.control_characters=control_characters
    self.shift = 0
    self.enabled = enabled
    self.buffers = []
    self.initBuffers() # the so called printQueue
    self.chunkSize = chunkSize
    Thread.__init__(self)

  def initBuffers(self):
    self.buffers = []
    for i in range(self.qtyChannels):
      self.buffers.append(bytearray())
    return self.buffers

  def queueForPrinting(self, queueData):
    # print('adding to queue: %s' % repr(queueData))
      # since this thread isn't actively grabbing data, it's added here...
    with self.lock:
      if self.enabled:
          if len(queueData) != len(self.buffers):
            raise Exception("[!] len(queueData) != len(self.buffers): ",len(queueData),len(self.buffers))
          for i in range(len(self.buffers)):
            if queueData[i]:
                self.buffers[i]+=queueData[i]

  def printBuffers(self):
      with self.lock:
        for n in range(len(self.buffers)):
          string = ''

          if self.chunkSize > len(self.buffers[n]):
            size = len(self.buffers[n])
          else:
            size = self.chunkSize

          if size > 0:
            for i in range(size):
              char=chr(0)
              val = self.buffers[n][i]

              if self.control_characters:
                TEST = True
              else:
                TEST = val > 31

              if TEST and not val in excludedChars:
                char = chr(val)
              if self.color: # add the ANSI escape sequence to encode the background color to value of val
                color = (val+self.shift+256)%256 # if we want to specify some amount of color shift...
                string += '\x1b[48;5;%sm%s\x1b[0m' % (int(color), char)
              else:
                string += char
            if self.enabled:
              sys.stdout.write(string)
              sys.stdout.flush()
          self.buffers[n] = self.buffers[n][size:] # remove chunk from queue. will enmpty over time if disabled

  def getState(self):
    with self.lock:
      state = {
        'enabled': self.enabled,
        'color': self.color,
        'control_characters': self.control_characters,
        'shift': self.shift,
      }
      return state

  def printEnable(self, value):
    with self.lock:
      if value:
        self.enabled = True
      else:
        self.enabled = False

  def colorEnable(self, value):
    with self.lock:
      if value:
        self.color = True
      else:
        self.color = False

  def ctlCharactersEnable(self, value):
    with self.lock:
      if value:
        self.control_characters = True
      else:
        self.control_characters = False

  def setColorShift(self, value):
    with self.lock:
      try:
        value = int(value)
      except:
        value = 0
      self.shift = value

  def run(self):
    print('[WRITER] run()')
    self.doRun=True
    while self.doRun:
      try:
        self.printBuffers()
        sleep(0.001)
      except Exception as e:
        print('[WRITER] Error: %s' % repr(e))

  def stop(self):
    print('[WRITER] stop()')
    self.doRun=False
    subprocess.run(
      ["reset"]
    )
    self.join()

#===========================================================================
# Audifer
# PyAudio stream instance and operations. By default pyAudio opens the stream in its own thread.
# Callback mode is used. Documentation for PyAudio states the process
# for playback runs in a separate thread. Initializing in a subclassed Thread may be redundant.

class Audifier():
  def __init__(self, qtyChannels, width=1, rate=44100, chunkSize=2048, deviceIndex=0, callback=None):
    if not callback:
      raise Exception('Audifier instance requires a callback function. Got: %s' % callback)

    self.doRun=False
    self.qtyChannels = qtyChannels
    self.width = width
    self.rate = rate
    self.chunkSize = chunkSize
    self.deviceIndex = deviceIndex
    self.callback = callback
    self.pa = pyaudio.PyAudio()
    self.stream = self.initPyAudioStream()

  def initPyAudioStream(self):

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

    stream = self.pa.open(
      format=self.pa.get_format_from_width(self.width),
      channels=self.qtyChannels,
      rate=self.rate,
      frames_per_buffer=self.chunkSize,
      input=False,
      output_device_index=self.deviceIndex,
      output=True,
      stream_callback=self.callback
    )
    return stream

  def start(self):
    print('[AUDIFIER] run()')
    print("Starting audio stream...")
    self.stream.start_stream()
    if self.stream.is_active():
      print("Audio stream is active.")

  def stop(self):
    print('[AUDIFIER] stop()')
    self.stream.close()
    self.pa.terminate()

