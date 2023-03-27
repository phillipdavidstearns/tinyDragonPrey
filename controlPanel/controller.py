#!/usr/bin/env python3

import os
import sys
import random
import requests
import subprocess

from decouple import config

from tornado.web import authenticated, Application, RequestHandler, StaticFileHandler
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.httputil import HTTPHeaders

import json

path = os.path.dirname(os.path.abspath(__file__))
debug = True

targets = [
'10.42.0.120',
'10.42.0.121',
'10.42.0.122',
'10.42.0.123'
]

#===========================================================================
# Listener

def nping_icmp_oneshot(parameters):
	try:
		target = parameters['target']
		message = parameters['message']
		IOLoop.current().run_in_executor(
			None,
			lambda: subprocess.call(
				["sudo","nping","--icmp",target,"-c","10","--data-string",message],
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
			lambda: subprocess.call(
				["sudo","nping","--icmp",target,"-c",count,"--delay",delay,"--data-string",message],
				stdout=subprocess.DEVNULL,
				stderr=subprocess.DEVNULL
			)
		)
	except Exception as e:
		print('nping_icmp_flood error:',e)
#===========================================================================
# Request handlers

class MainHandler(RequestHandler):
	def get(self):
		self.set_status(200)
		self.render('index.html')
	async def post(self):
		try:
			request = json.loads(self.request.body.decode('utf-8'))
		except Exception as e:
			print('While parsing request:', e)
			self.set_status(400)

		if 'set' in request:
			url = 'http://%s' % targets[request['target']]
			data = { "set" : request['set'] }
			IOLoop.current().run_in_executor(None,lambda: session.post(url=url,data=json.dumps(data)))
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
		session = requests.session()
		application = make_app()
		http_server = HTTPServer(application)
		http_server.listen(1337)
		main_loop = IOLoop.current()
		main_loop.start()
	except Exception as e:
		print('Ooops! Exception caught:',e)
