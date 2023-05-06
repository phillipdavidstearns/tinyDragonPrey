#!/usr/bin/env python3

import os
import sys
from random import random
import requests
import subprocess
from math import pi, sin, pow
from decouple import config
from netifaces import AF_INET, ifaddresses
import socket
import asyncio
from threading import Thread
from queue import Queue

from tornado.web import authenticated, Application, RequestHandler, StaticFileHandler
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.httputil import HTTPHeaders

import json

path = os.path.dirname(os.path.abspath(__file__))
debug = True

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

def availableNetworks():
	ips={}
	if_names = socket.if_nameindex()
	for if_name in if_names:
		try:
			ip = { if_name[1] : ifaddresses(if_name[1])[AF_INET][0]['addr'] }
			ips.update(ip)
		except:
			pass
	return ips

def scanTarget(target_ip, timeout=0.5):
	try:
		url='http://'+target_ip+'/?resource=state'
		response = session.get(
			url,
			timeout=timeout
		)
		result = response.json()
		return result
	except:
		return None

def worker(targets, q):
	while True:
		ip = q.get()
		result = scanTarget(ip)
		if result:
			target={}
			target['ip'] = ip
			target['state'] = result
			targets['targets'].append(target)
		q.task_done()

def threadedScan(ip, concurrent=128):
	targets = { 'targets' : [] }
	q = Queue(concurrent * 2)
	for i in range(concurrent):
		t = Thread(target=worker,args=(targets,q))
		t.daemon = True
		t.start()
	network = '.'.join(ip.split('.')[:3])
	if ip.split('.')[0] == '127':
		return targets
	try:
		for i in range(255):
			target_ip = '.'.join([network,str(i)])
			if target_ip == ip:
				continue
			q.put(target_ip)
		q.join()
	except Exception as e:
		print('In threadedScan(): %s' % repr(e))
	finally:
		return targets

#===========================================================================
# Request handlers

class MainHandler(RequestHandler):
	def get(self):
		self.set_status(200)
		self.render('index.html')
	async def post(self):
		action = self.get_query_argument('action',None)
		if action == 'get_networks':
			networks = availableNetworks()
			self.write(networks)
		elif action == 'get_targets':
			network = self.get_query_argument('network', None)
			if network:
				# targets = await acquireTargets(network)
				targets = await IOLoop.current().run_in_executor(
					None,
					threadedScan,
					network
				)
				print('targets: %s' % targets)
				if targets['targets']:
					self.write(targets)
				else:
					self.set_status(404)
			else:
				self.set_status(404)
		elif action == 'get_state':
			target=None
			try:
				body = json.loads(self.request.body.decode('utf-8'))
				if 'target' in body:
					target = body['target']
			except:
				print('While parsing request:', e)
				self.set_status(400)
				return
			print('target: %s' % target)
			
			state = {}
			url = 'http://%s/?resource=state' % target
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
			print('state of target:%s - %s' % (target, repr(state)))
			self.write(state)
		elif action == 'get_aps':
			target=None
			try:
				body = json.loads(self.request.body.decode('utf-8'))
				if 'target' in body:
					target = body['target']
			except:
				print('While parsing request:', e)
				self.set_status(400)
				return
			print('target: %s' % target)
			aps = {}
			url = 'http://%s/?resource=aps' % target
			try:
				response = await IOLoop.current().run_in_executor(
					None,
					lambda: session.get(url,timeout=(2,2))
				)
				aps['aps'] = response.json()
				aps['online']=True
			except:
				aps['online']=False
				pass
			print('aps sniffed on target %s - %s' % (target,repr(aps)))
			self.write(aps)
		else:
			try:
				request = json.loads(self.request.body.decode('utf-8'))
			except Exception as e:
				print('While parsing request:', e)
				self.set_status(400)
				return
			if 'set' in request:
				try:
					url = 'http://%s' % request['target']
					data = { "set" : request['set'] }
					await IOLoop.current().run_in_executor(
						None,
						lambda: session.post(
							url=url,
							data=json.dumps(data)
						)
					)
				except Exception as e:
					self.set_status(500)
					print('Setting parameters for %s:' % request['target'], e)
			elif 'command' in request:
				parameters={}
				try:
					command = request['command']
					target = request['target']
					parameters = request['parameters']
					parameters['target'] = target
				except Exception as e:
					print('error parsing command:%s - %s'% (repr(e), repr(request)))
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
