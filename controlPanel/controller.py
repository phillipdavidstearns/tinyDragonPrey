#!/usr/bin/env python3

import os
import sys
import random
import requests

from decouple import config

from tornado.web import authenticated, Application, RequestHandler, StaticFileHandler
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.httputil import HTTPHeaders

import json

path = os.path.dirname(os.path.abspath(__file__))
debug = True

#===========================================================================
# Listener


#===========================================================================
# Request handlers

class MainHandler(RequestHandler):
	def get(self):
		self.set_status(200)
		self.render('index.html')
	async def post(self):
		try:
			command = json.loads(self.request.body.decode('utf-8'))
		except Exception as e:
			print('While parsing request:', e)
			self.set_status(400)
		url = 'http://10.42.0.120'
		data = self.request.body
		response = await IOLoop.current().run_in_executor(None, lambda: session.post(url=url,data=data))
		self.set_status(response.status_code)

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
