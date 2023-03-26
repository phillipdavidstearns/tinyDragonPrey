#!/usr/bin/env python3

import os
import sys
from signal import *
import socket
import pyaudio
import re
from threading import Thread
from time import sleep
import random
from decouple import config

import subprocess

from tornado.web import authenticated, Application, RequestHandler, StaticFileHandler
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.httputil import HTTPHeaders
import json

path = os.path.dirname(os.path.abspath(__file__))
debug = True

#===========================================================================
# Listener
# A socket based packet sniffer. Main loop will check sockets for data and grab what's there,
# storing in a buffer to be extracted later. chunkSize should be a relatively small power of two.
# Until I can figure out a way to tinker with the sockets and set appropriate permissions, this
# is what requires running the script as root.

class Listener(Thread):
	def __init__(self, interfaces, chunkSize=4096):
		self.interfaces = interfaces
		self.chunkSize = chunkSize # used to fine tune how much is "grabbed" from the socket
		self.sockets = self.initSockets()
		self.buffers = self.initBuffers() # data will be into and out of the buffer(s)
		self.doRun = False # flag to run main loop & help w/ smooth shutdown of thread
		Thread.__init__(self)

	def initSockets(self):
		sockets = []
		for interface in self.interfaces:
			# etablishes a RAW socket on the given interface, e.g. eth0. meant to only be read.
			s = socket.socket(socket.AF_PACKET, socket.SOCK_RAW, socket.ntohs(0x0003))
			s.bind((interface, 0))
			s.setblocking(False) # non-blocking
			sockets.append(s)
		return sockets

	def initBuffers(self):
		# nothing up my sleeves here...
		buffers = []
		for interface in self.interfaces :
			buffers.append(bytearray())
		return buffers

	def readSockets(self):
		if len(self.sockets) < self.chunkSize:
			for i in range(len(self.sockets)):
				try: # grab a chunk of data from the socket...
					# data = self.sockets[i].recv(self.chunkSize)
					data = self.sockets[i].recv(65536)
					if data:
						self.buffers[i] += data # if there's any data there, add it to the buffer
				except: # if there's definitely no data to be read. the socket will throw and exception
					pass

	def extractFrames(self, frames):
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
			self.readSockets()
			sleep(0.0001)

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
		self.qtyChannels = qtyChannels # we need to know how many streams of data we'll be printing
		self.doRun = False
		self.color=color
		self.control_characters=control_characters
		self.shift = 0
		self.enabled = enabled
		self.buffers = self.initBuffers() # the so called printQueue
		self.chunkSize = chunkSize
		Thread.__init__(self)

	def initBuffers(self):
		buffers = []
		for i in range(self.qtyChannels):
			buffers.append(bytearray())
		return buffers

	def queueForPrinting(self, queueData):
		# since this thread isn't actively grabbing data, it's added here...
		if len(queueData) != len(self.buffers):
			raise Exception("[!] len(queueData) != len(self.buffers): ",len(queueData),len(self.buffers))
		for i in range(len(self.buffers)):
			self.buffers[i]+=queueData[i]

	def printBuffers(self):
		writeFlag = False
		for n in range(len(self.buffers)):
			writeFlag = writeFlag or len(self.buffers[n]) > self.chunkSize
		# assembles a string to be printed for each stream in the buffers.
		if writeFlag:
			size = 0
			for n in range(len(self.buffers)):
				string = ''
				# if there's less data in the buffer than the chunkSize, we print only what is there
				if self.chunkSize > len(self.buffers[n]):
					size = len(self.buffers[n])
				else:
					size = self.chunkSize

				for i in range(size):
					char=chr(0) # for some reason, setting the character to utf-8 encoded 'null' works best
					val = self.buffers[n][i] # used to be wrapped in a try/except block... shouldn't be necessary now

					# if we want to try to print everything, including control characters...
					if self.control_characters:
						TEST = True
					else:
						TEST = val > 31

					if TEST:
						char = chr(val)
					if self.color: # add the ANSI escape sequence to encode the background color to value of val
						color = (val+self.shift+256)%256 # if we want to specify some amount of color shift...
						string += '\x1b[48;5;%sm%s' % (color, char)
					else:
						string += char
				if self.color:
					string+='\x1b[0m' # terminate the string with the ANSI reset escape sequence
				if self.enabled:
					sys.stdout.write(string)
				self.buffers[n]=self.buffers[n][size:] # remove the printed bit from the buffers
			if self.enabled:
				sys.stdout.flush()

	def run(self):
		print('[WRITER] run()')
		self.doRun=True
		while self.doRun:
			self.printBuffers()
			sleep(0.0001)

	def stop(self):
		print('[WRITER] stop()')
		self.doRun=False
		self.join()

#===========================================================================
# callbak for PyAudio stream instance in Audifier

def audify_data_callback(in_data, frame_count, time_info, status):
	audioChunk, printQueue = sockets.extractFrames(frame_count)
	writer.queueForPrinting(printQueue)
	return(bytes(audioChunk), pyaudio.paContinue)

#===========================================================================
# Audifer
# PyAudio stream instance and operations. By default pyAudio opens the stream in its own thread.
# Callback mode is used. Documentation for PyAudio states the process
# for playback runs in a separate thread. Initializing in a subclassed Thread may be redundant.

class Audifier():
	def __init__(self, qtyChannels, width=1, rate=44100, chunkSize=2048, deviceIndex=0, callback=audify_data_callback):
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
		# 	self.pa.is_format_supported(
		# 		rate = self.rate,
		# 		output_device=self.deviceIndex,
		# 		output_channels=self.qtyChannels,
		# 		output_format=self.pa.get_format_from_width(self.width)
		# 	)
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

#===========================================================================
# Signal Handler / shutdown procedure

def signalHandler(signum, frame):
	print('\n[!] Caught termination signal: ', signum)
	shutdown()


def shutdown():
	main_loop.stop()
	# Just to make sure the console formatting returns to "normal"
	try:
		if writer.color:
			print('Stopping Writer...')
			writer.stop()
			print('\x1b[0m',end='')
		else:
			print('Stopping Writer...')
			writer.stop()
	except Exception as e:
		print("Error stopping Writer:",e)

	# Shutdown the PyAudio instance
	print('Stopping audio stream...')
	try:
		audifier.stop()
	except Exception as e:
		print("Failed to terminate PyAudio instance:",e)

	# close the sockets
	print('Closing Listener...')
	try:
		sockets.stop()
	except Exception as e:
		print("Error closing socket:",e)

	print('Peace out!')
	sys.exit(0)

#===========================================================================
# Request handlers

class MainHandler(RequestHandler):
	def get(self):
		self.set_status(200)
		self.render('index.html')
	def post(self):
		try:
			command = json.loads(self.request.body.decode('utf-8'))
		except Exception as e:
			print('While parsing request:', e)
			self.set_status(400)

		# print(command)

		for item in command['command']:
			if item['parameter'] == "print":
				writer.enabled = item['value']
			elif item['parameter'] == "color":
				writer.color = item['value']
			elif item['parameter'] == "color":
				writer.color = item['value']
			elif item['parameter'] == "control_characters":
				writer.control_characters = item['value']
			elif item['parameter'] == "color_shift":
				writer.shift = int(item['value'])
			elif item['parameter'] == "wlan1_monitor_mode":
				wlan1_monitor_mode = item['value']
				if wlan1_monitor_mode:
					subprocess.call(["ip","link","set","wlan1","down"])
					subprocess.call(["iwconfig","wlan1","mode","monitor"])
					subprocess.call(["ip","link","set","wlan1","up"])
				else:
					subprocess.call(["ip","link","set","wlan1","down"])
					subprocess.call(["iwconfig","wlan1","mode","managed"])
					subprocess.call(["ip","link","set","wlan1","up"])
			elif item['parameter'] == "wlan1_channel":
				wlan1_channel = int(item['value'])
				subprocess.call(
					["iwconfig","wlan1","channel",str(max(1,min(13,wlan1_channel)))],
					stdout=subprocess.DEVNULL,
    				stderr=subprocess.DEVNULL
    			)

#===========================================================================
# Executed when run as stand alone

def make_app():
	settings = dict(
		template_path = os.path.join(path, 'templates'),
		static_path = os.path.join(path, 'static'),
		debug = debug
	)
	urls = [
		(r'/', MainHandler)
	]
	return Application(urls, **settings)

if __name__ == "__main__":
	try:

		# check to see if user is root
		if os.getuid() != 0:
			print("Must be run as root!")
			exit(1)

		signal(SIGINT, signalHandler)
		signal(SIGTERM, signalHandler)
		signal(SIGHUP, signalHandler)

		interfaces = []
		ifs = re.split(r'[:;,\.\-_\+|]', config('INTERFACES'))
		for i in range(len(ifs)) :
			interfaces.append(ifs[i])

		CHANNELS = len(interfaces)
		DEVICE = int(config('DEVICE'))
		CHUNK = int(config('CHUNK'))
		RATE = int(config('RATE'))
		WIDTH = int(config('WIDTH'))
		COLOR = config('COLOR') == "True"
		CONTROL_CHARACTERS = config('CONTROL_CHARACTERS') == "True"

		wlan1_monitor_mode = False
		wlan1_channel = 0

		print("INTERFACES: ", interfaces)
		print("CHANNELS: ", CHANNELS)
		print("CHUNK SIZE:", CHUNK)
		print("SAMPLE RATE:", RATE)
		print("BYTES PER SAMPLE:", WIDTH)
		print("COLOR:", COLOR)
		print("CONTROL_CHARACTERS:", CONTROL_CHARACTERS)

		# open the sockets
		try:
			sockets = Listener(interfaces)
			sockets.start()
		except Exception as e:
			print('Error starting socket listeners:',e)

		# fire up the printing presses
		try:
			writer = Writer(CHANNELS, CHUNK*CHANNELS)
			writer.start()
		except Exception as e:
			print('Error starting console writers:',e)

		# spin up the audio playback engine
		try:
			audifier = Audifier(CHANNELS, WIDTH, RATE, CHUNK, DEVICE)
			audifier.start()
		except Exception as e:
			print('Error starting audifiers:',e)

		# run the main loop

		application = make_app()
		http_server = HTTPServer(application)
		http_server.listen(80)
		main_loop = IOLoop.current()
		main_loop.start()
	except Exception as e:
		print('Ooops! Exception caught:',e)
