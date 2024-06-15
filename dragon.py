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

#===========================================================================
# Dragon
# Manages the trio of packet sniffer, data printer, and audifier

class Dragon(Thread):
  def __init__(self, interfaces='eth0', chunk_size=1024, print_enabled=False, color_enabled=False, special_characters_enabled=True, audio_device_index=0, sample_rate=44100, sample_width=1, ap_logging_enabled=True):
    if os.getuid() != 0:
      raise Exception('This module requires root priviledges.')
    super().__init__()
    self.daemon = True
    self.interfaces = []
    ifs = re.split(r'[:;,\.\-_\+|]', interfaces)
    for i in range(len(ifs)) :
      self.interfaces.append(ifs[i])
    self.qty_channels = len(self.interfaces)
    self.sockets = None
    self.writer = None
    self.audifier = None
    self.audio_device_index=audio_device_index
    self.chunk_size = chunk_size
    self.sample_rate = sample_rate
    self.sample_width = sample_width
    self.print_enabled = print_enabled
    self.color_enabled = color_enabled
    self.special_characters_enabled = special_characters_enabled
    self.ap_logging_enabled = ap_logging_enabled
    self.do_run = False
    self.is_stopped = True
    self.is_running = False
    self.excluded_chars=[1,2,3,4,5,6,7,8,9,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,155,255]

    logging.debug("audio_device_index: %s" % self.audio_device_index)
    logging.debug("interfaces: %s" % self.interfaces)
    logging.debug("qty_channels: %s" % self.qty_channels)
    logging.debug("chunk_size: %s" %  self.chunk_size)
    logging.debug("sample_rate: %s" % self.sample_rate)
    logging.debug("sample_width: %s" % self.sample_width)
    logging.debug("print_enabled: %s" % self.print_enabled)
    logging.debug("color_enabled: %s" % self.color_enabled)
    logging.debug("special_characters_enabled: %s" % self.special_characters_enabled)
    logging.debug("ap_logging_enabled: %s" % self.ap_logging_enabled)

  def audify_data_callback(self, in_data, frame_count, time_info, status):
    audio_chunk, print_queue = self.sockets.extract_frames(frame_count)
    self.writer.queue_for_printing(print_queue)
    return(bytes(audio_chunk), pyaudio.paContinue)

  def run(self):
    self.do_run = True

    try:
      self.sockets = Listener(
        interfaces=self.interfaces,
        ap_logging_enabled=self.ap_logging_enabled
      )
      self.sockets.start()
    except Exception as e:
      logging.error(f'Error starting socket listeners: {repr(e)}')

    try:
      self.writer = Writer(
        qty_channels=self.qty_channels,
        chunk_size=self.chunk_size * self.qty_channels,
        color=self.color_enabled,
        linebreaks=self.special_characters_enabled,
        enabled=self.print_enabled
      )
      self.writer.start()
    except Exception as e:
      logging.error(f'Error starting console writers: {repr(e)}')

    try:
      self.audifier = Audifier(
        qty_channels=self.qty_channels,
        sample_width=self.sample_width,
        sample_rate=self.sample_rate,
        chunk_size=self.chunk_size,
        audio_device_index=self.audio_device_index,
        callback=self.audify_data_callback
      )
      self.audifier.start()
    except Exception as e:
      logging.error(f'Error starting audifiers: {repr(e)}')

    self.is_stopped = False
    self.is_running = True
  
    while self.do_run:
        sleep(0.1)

    self.is_stopped = True

  def stop(self):
    self.do_run = False

    while not self.is_stopped:
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
    self.is_running = False
    self.join()

  def get_state(self):
    return self.writer.get_state()

  def get_access_points(self):
    return self.sockets.get_access_points()

#===========================================================================
# Listener
# A socket based packet sniffer. Main loop will check sockets for data and grab what's there,
# storing in a buffer to be extracted later. chunk_size should be a relatively small power of two.
# Until I can figure out a way to tinker with the sockets and set appropriate permissions, this
# is what requires running the script as root.

class Listener(Thread):
  def __init__(self, interfaces, chunk_size=65535, ap_logging_enabled=True):
    super().__init__()
    self.daemon = True
    self._lock=Lock()
    self._interfaces = interfaces
    self._chunk_size = chunk_size # used to fine tune how much is "grabbed" from the socket
    self._sockets = self._init_sockets()
    self._buffers = self._init_buffers()
    self._do_run = False # flag to run main loop & help w/ smooth shutdown of thread
    self._access_points = {}
    self._ap_logging_enabled=ap_logging_enabled # if True, the packets are analyzed for access point data, which is stored in self._access_points

  def _init_sockets(self):
    self._sockets = []
    for interface in self._interfaces:
      # etablishes a RAW socket on the given interface, e.g. eth0. meant to only be read.
      # only compatible with linux systems
      s = socket.socket(
        family=socket.AF_PACKET,
        type=socket.SOCK_RAW,
        proto=socket.ntohs(0x0003)
      )
      s.bind((interface, 0))
      s.setblocking(False) # non-blocking
      self._sockets.append(s)
    return self._sockets

  def _init_buffers(self):
    # create a list of buffers, one for each interface to be listened to
    # each buffer is a bytearray
    self._buffers = []
    for interface in self._interfaces :
      self._buffers.append(bytearray())
    return self._buffers

  def _analyze_packet(self, pkt):
    # Parses packets and looks for probe requests from devices,
    # extracts the SSID and MAC address associated with the access point
    # the packet was destined for.
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

  def _add_access_point(self, access_point):
    # need to limit the size of self._access_points
    # need to implement a routine to reset
    # shouldn't need to hang on to this data here
    for key in access_point.keys():
      if not key in self._access_points:
        self._access_points[key] = {}
        self._access_points[key]['MACs'] = [access_point[key]['MAC']]
        self._access_points[key]['count'] = 1
      else:
        if not access_point[key]['MAC'] in self._access_points[key]['MACs']:
          self._access_points[key]['MACs'].append(access_point[key]['MAC'])
        self._access_points[key]['count'] += 1

  def _read_sockets(self):
    for i in range(len(self._sockets)):
      try:
        # grab a chunk of data from the socket...
        if data := self._sockets[i].recv(self._chunk_size):
          if self._interfaces[i] == 'wlan1' and self._ap_logging_enabled:
            if access_point := self._analyze_packet(data): # extract access_points
              self._add_access_point(access_point)
          self._buffers[i] += data # if there's any data there, add it to the buffer
      except: # if there's no data to be read. the socket will throw an exception
        pass


  def extract_frames(self, frames):
    slices = [] # for making the chunk of audio data
    print_queue = [] # for assembling the data into chunks for printing  
    with self._lock:
      for n in range(len(self._buffers)):
        bufferSlice = self._buffers[n][:frames] # grab a slice of data from the buffer
        print_queue.append(bufferSlice) # whatever we got, add it to the print queue. no need to pad
        # this makes sure we return as many frames as requested, by padding with audio "0"
        padded = bufferSlice + bytes([127]) * (frames - len(bufferSlice))
        slices.append(padded)
        self._buffers[n] = self._buffers[n][frames:] # remove the extracted data from the buffer
      
      match len(self._buffers):
        case 2: # interleave the slices to form a stereo chunk
          audio_chunk = [ x for y in zip(slices[0], slices[1]) for x in y ]
        case 1: # marvelous mono
          audio_chunk = slices[0]
        case _:
          raise Exception("[!] Only supports 1 or two channels/interfaces.")
    return audio_chunk, print_queue

  def get_access_points(self):
    with self._lock:
      return self._access_points.copy()

  def is_running(self):
    return not self._do_run

  def run(self):
    logging.info('[LISTENER] run()')
    self._do_run=True
    while self._do_run:
      try:
        self._read_sockets()
        sleep(0.0001)
      except Exception as e:
        logging.error(f'[LISTENER] Error executing readSockets(): {repr(e)}')

  def stop(self):
    logging.info('[LISTENER] stop()')
    self._do_run=False
    try:
      for socket in self._sockets:
        socket.close()
    except Exception as e:
      logging.error(f'While closing socket: {repr(e)}')
    self.join()

#===========================================================================
# Writer
# Handles console print operations in an independent thread. To prevent backlog of print data,
# The chunk_size should be set to the same value as for the audio device. Right now, this is done
# in the initialization portion of the script when run as standalone.

class Writer(Thread):
  def __init__(self, qty_channels=1, chunk_size=256, color=False, linebreaks=True, enabled=False):
    super().__init__()
    self.daemon = True
    self._lock=Lock()
    self._qty_channels = qty_channels # we need to know how many streams of data we'll be printing
    self._do_run = False
    self._color=color
    self._linebreaks=linebreaks
    self._shift = 0
    self._enabled = enabled
    self._chunk_size = chunk_size
    self._buffers = self._init_buffers() # the so called print_queue

  def _init_buffers(self):
    self._buffers = []
    for i in range(self._qty_channels):
      self._buffers.append(bytearray())
    return self._buffers

  def queue_for_printing(self, queue_data):
    # this thread isn't actively grabbing data, it's added here...
    if not self._enabled:
      return
    
    if len(queue_data) != len(self._buffers):
      raise Exception(f"[!] len(queue_data): {len(queue_data)} != len(self.buffers): {len(self._buffers)}")
    
    for i in range(len(self._buffers)):
      if queue_data[i]:
        with self._lock:
          self._buffers[i] += queue_data[i]

  def _print_buffers(self):
    if not self._enabled:
      return

    for n in range(len(self._buffers)):
      string = ''

      if self._chunk_size > len(self._buffers[n]):
        size = len(self._buffers[n])
      else:
        size = self._chunk_size

      if size > 0:
        for i in range(size):
          char=chr(0)
          val = self._buffers[n][i]
          
          if self._linebreaks:
            TEST = True
          else:
            TEST = val > 31
          
          if TEST and not val in self.excluded_chars:
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

  def get_state(self):
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
        self._init_buffers()

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

  def is_running(self):
    with self._lock:
      return not self._do_run

  def run(self):
    logging.info('[WRITER] run()')
    self._do_run = True
    while self._do_run:
      try:
        self._print_buffers()
        sleep(0.001)
      except Exception as e:
        logging.error(f'[WRITER] Error while executing printBuffers(): {repr(e)}')
        self.stop()

  def stop(self):
    logging.info('[WRITER] stop()')
    self._do_run = False
    os.system('reset')
    self.join()

#===========================================================================
# Audifer
# PyAudio stream instance and operations. By default pyAudio opens the stream in its own thread.
# Callback mode is used. Documentation for PyAudio states the process
# for playback runs in a sepasample_rate thread. Initializing in a subclassed Thread may be redundant.

class Audifier():
  def __init__(self, qty_channels=1, sample_width=1, sample_rate=44100, chunk_size=2048, audio_device_index=0, callback=None):
    if not callback:
      raise Exception(f'Audifier instance requires a callback function. Got: {repr(callback)}')

    self._qty_channels = qty_channels
    self._sample_width = sample_width
    self._sample_rate = sample_rate
    self._chunk_size = chunk_size
    self._audio_device_index = audio_device_index
    self._callback = callback
    self._pa = pyaudio.PyAudio()
    self._stream = self._init_py_audio_stream()

  def _init_py_audio_stream(self):

    # These are here for debugging purposes...
    # for some reason, HDMI output eludes me.
    # print('format:', self.pa.get_format_from_width(self.sample_width))
    
    # print(
    #   self.pa.is_format_supported(
    #     sample_rate = self.sample_rate,
    #     output_device=self.deviceIndex,
    #     output_channels=self.qty_channels,
    #     output_format=self.pa.get_format_from_width(self.sample_width)
    #   )
    # )

    self._stream = self._pa.open(
      format=self._pa.get_format_from_width(self._sample_width),
      channels=self._qty_channels,
      rate=self._sample_rate,
      frames_per_buffer=self._chunk_size,
      input=False,
      output_device_index=self._audio_device_index,
      output=True,
      stream_callback=self._callback,
      start=False
    )
    return self._stream

  def is_running(self):
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
