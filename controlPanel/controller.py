#!/usr/bin/env python3

import os
import sys
from random import random
import requests
import subprocess
from math import pi, sin, pow
from decouple import config

from tornado.web import authenticated, Application, RequestHandler, StaticFileHandler
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.httputil import HTTPHeaders

import json

path = os.path.dirname(os.path.abspath(__file__))
debug = True

# remote showtime
# targets = [
# '10.42.0.121',
# '10.42.0.122',
# '10.42.0.123'
# ]

# local rehearsal
targets = [
'10.42.0.120',
'10.42.0.124',
'10.42.0.125'
]

#===========================================================================
# Utilities

def generateWaveform(frequency=1000, amplitude=1.0, duration=1400, shape="sine", sampleRate=44100, bitDepth=8):
	# frequency in Hz
	# amplitude 0.0 - 1.0
	# duration in samples
	samples = round(sampleRate/frequency) # length of 1 period
	waveform = bytearray()
	if(shape == "sine"):
		maxAmp = int(pow(2,bitDepth)/2-1)
		theta = 0.0
		step = 2*pi/samples
		for i in range(duration):
			sample = round(maxAmp*amplitude*sin(theta)+maxAmp)
			waveform.append(sample)
			theta+=step
		return waveform
	elif(shape == "tri"):
		maxAmp = int(pow(2,bitDepth)-1)
		for i in range(duration):
			sample = round(maxAmp*(1-2*abs(round((i%samples)/samples) - (i%samples)/samples)))
			waveform.append(sample)
		return waveform
	elif(shape == "square"):
		maxAmp = int(pow(2,bitDepth)-1)
		for i in range(duration):
			sample = maxAmp*abs(round((i%samples)/samples))
			waveform.append(sample)
		return waveform
	elif(shape == "noise"):
		maxAmp = int(pow(2,bitDepth)-1)
		for i in range(duration):
			sample = round(maxAmp*random())
			waveform.append(sample)
		return waveform
	elif(shape == "random"):
		maxAmp = int(pow(2,bitDepth)-1)
		sample = bytearray()
		for i in range(samples):
			sample.append(round(maxAmp*random()))
		for i in range(duration):
			waveform.append(sample[i % len(sample)])
		return waveform

def sendTone(parameters):
	try:
		frequency=int(parameters['frequency'])
		amplitude=float(parameters['amplitude'])
		duration=int(parameters['duration'])
		shape=parameters['shape']
		parameters['message'] = generateWaveform(
			frequency=frequency,
			amplitude=amplitude,
			duration=duration,
			shape=shape
		)
		nping_icmp_oneshot_bytes(parameters)
	except Exception as e:
		print('sendTone error:',e)

def nping_icmp_oneshot_bytes(parameters):
	try:
		target = parameters['target']
		message = parameters['message']
		IOLoop.current().run_in_executor(
			None,
			lambda: subprocess.run(
				["sudo","nping","--icmp",target,"-c","1","--data",message.hex()],
				stdout=subprocess.DEVNULL,
				stderr=subprocess.DEVNULL
			)
		)
	except Exception as e:
		print('nping_icmp_oneshot error:',e)


def nping_icmp_oneshot(parameters):
	try:
		target = parameters['target']
		message = parameters['message']
		IOLoop.current().run_in_executor(
			None,
			lambda: subprocess.run(
				["sudo","nping","--icmp",target,"-c","1","--data-string",message],
				stdout=subprocess.DEVNULL,
				stderr=subprocess.DEVNULL
			)
		)
	except Exception as e:
		print('nping_icmp_oneshot error:',e)

def nping_icmp_flood(parameters):
	try:
		target = parameters['target']
		message = parameters['message']
		delay = parameters['delay']
		count = parameters['count']
		IOLoop.current().run_in_executor(
			None,
			lambda: subprocess.run(
				["sudo","nping","--icmp",target,"-c",count,"--delay",delay,"--data-string",message],
				stdout=subprocess.DEVNULL,
				stderr=subprocess.DEVNULL
			)
		)
	except Exception as e:
		print('nping_icmp_flood error:',e)

def nmap_scan(parameters):
	try:
		call = ["sudo","nmap"]
		if 'args' in parameters:
			for arg in parameters['args']:
				call.append(arg)
		call.append(parameters['target'])
		IOLoop.current().run_in_executor(
			None,
			lambda: subprocess.run(
				call,
				stdout=subprocess.DEVNULL,
				stderr=subprocess.DEVNULL
			)
		)
	except Exception as e:
		print('nmap scan error:',e)

#===========================================================================
# Request handlers

class MainHandler(RequestHandler):
	def get(self):
		self.set_status(200)
		self.render('index.html')
	async def post(self):
		action = self.get_query_argument('action',None)
		
		if action == 'get_states':
			states = {'states':[]}
			state = {}
			for ip in targets:
				url = 'http://%s/?resource=state' % ip
				try:
					response = await IOLoop.current().run_in_executor(
						None,
						lambda: session.get(url,timeout=(2,2))
					)
					state = response.json()
					state['online']=True
				except:
					state['online']=False
					pass
				state['ip']=ip
				states['states'].append(state)
			self.write(states)
		elif action == 'get_aps':
			apLists = {'apLists':[]}
			aplist = {}
			for ip in targets:
				url = 'http://%s/?resource=aps' % ip
				try:
					response = await IOLoop.current().run_in_executor(
						None,
						lambda: session.get(url,timeout=(2,2))
					)
					aplist = response.json()
					aplist['online']=True
				except:
					aplist['online']=False
					pass
				apLists['apLists'].append(aplist)
			self.write(apLists)

		else:
			try:
				request = json.loads(self.request.body.decode('utf-8'))
			except Exception as e:
				print('While parsing request:', e)
				self.set_status(400)

			if 'set' in request:
				try:
					url = 'http://%s' % targets[request['target']]
					data = { "set" : request['set'] }
					IOLoop.current().run_in_executor(None,lambda: session.post(url=url,data=json.dumps(data)))
				except Exception as e:
					self.set_status(500)
					print('Setting parameters for %s:' % parameters['target'], e)
			elif 'command' in request:
				parameters={}
				try:
					command = request['command']
					target = targets[int(request['target'])]
					parameters = request['parameters']
					parameters['target'] = target
				except Exception as e:
					print('error parsing command:',e)
				if command == 'nping_icmp_oneshot':
					nping_icmp_oneshot(parameters)
				elif command == 'nping_icmp_flood':
					nping_icmp_flood(parameters)
				elif command == 'tone':
					sendTone(parameters)
				elif command == 'scan':
					nmap_scan(parameters)
				elif command == 'start_ap':
					start_ap(parameters)
				elif command == 'stop_ap':
					stop_ap(parameters)

#===========================================================================
# Executed when run as stand alone

def start_ap(parameters):
	try:
		# print('start_ap:',parameters)
		url = 'http://%s' % parameters['target']
		data = { 
			"action": "start_ap",
			"parameters" : parameters
		}
		IOLoop.current().run_in_executor(None,lambda: session.post(url=url,data=json.dumps(data)))
	except Exception as e:
		print('While setting up rogue AP on %s:' % parameters['target'], e)

def stop_ap(parameters):
	try:
		# print('stop_ap:',parameters)
		url = 'http://%s' % parameters['target']
		data = { "action": "stop_ap" }
		IOLoop.current().run_in_executor(None,lambda: session.post(url=url,data=json.dumps(data)))
	except Exception as e:
		print('While stopping rogue AP on %s:' % parameters['target'], e)

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
		generateWaveform()
		session = requests.session()
		application = make_app()
		http_server = HTTPServer(application)
		http_server.listen(1337)
		main_loop = IOLoop.current()
		main_loop.start()
	except Exception as e:
		print('Ooops! Exception caught:',e)
