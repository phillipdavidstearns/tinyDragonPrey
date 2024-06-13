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

from signal import *

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
      sample = round(maxAmp * amplitude * sin(theta) + maxAmp)
      waveform.append(sample)
      theta += step
    return waveform

  if(shape == "tri"):
    maxAmp = int(pow(2,bitDepth)-1)
    for i in range(duration):
      sample = round(maxAmp*(1-2*abs(round((i%samples)/samples) - (i%samples)/samples)))
      waveform.append(sample)
    return waveform

  if(shape == "square"):
    maxAmp = int(pow(2,bitDepth)-1)
    for i in range(duration):
      sample = maxAmp*abs(round((i%samples)/samples))
      waveform.append(sample)
    return waveform

  if(shape == "noise"):
    maxAmp = int(pow(2,bitDepth)-1)
    for i in range(duration):
      sample = round(maxAmp*random())
      waveform.append(sample)
    return waveform

  if(shape == "random"):
    maxAmp = int(pow(2,bitDepth)-1)
    sample = bytearray()
    for i in range(samples):
      sample.append(round(maxAmp*random()))
    for i in range(duration):
      waveform.append(sample[i % len(sample)])
    return waveform

def sendTone(parameters):
  try:
    frequency=float(parameters['frequency'])
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
      ip = {if_name[1]: ifaddresses(if_name[1])[AF_INET][0]['addr']}
      ips.update(ip)
    except:
      continue
  return ips

def scanTarget(target_ip, timeout=0.5):
  try:
    response = session.get(
      url=f"http://{target_ip}/?resource=state",
      timeout=timeout
    )
    result = response.json()
    # print('[scanTarget] Scan result: %s' % repr(result))
    return result
  except Exception as e:
    # print('[scanTarget] Exception: %s' % repr(e))
    return None

def worker(targets, q):
  while True:
    ip = q.get()
    if (result := scanTarget(ip)):
      target={}
      target['ip'] = ip
      target['state'] = result
      targets.append(target)
    q.task_done()

def threadedScan(ip, concurrent=128):
  targets = []
  q = Queue(concurrent * 2)
  for i in range(concurrent):
    t = Thread(target=worker, args=(targets,q))
    t.daemon = True
    t.start()
  network = '.'.join(ip.split('.')[:3])
  if ip.split('.')[0] == '127':
    return { 'targets' : targets }
  try:
    for i in range(255):
      target_ip = '.'.join([network, str(i)])
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

class SetHandler(RequestHandler):
  async def post(self):

    try:
      request = json.loads(self.request.body.decode('utf-8'))
    except Exception as e:
      print('While parsing request:', e)
      self.set_status(400)
      return

    try:
      result = await IOLoop.current().run_in_executor(
        None,
        lambda: session.post(
          url=f"http://{request['target']}" ,
          data=json.dumps({"set": request['set']})
        )
      )
      self.set_status(result.status_code)
      return
    except Exception as e:
      print(f'SetHandler() While parsing request: {repr(e)}')
      self.set_status(500)
      return
      # print('Setting parameters for %s:' % request['target'], e)

class RunHandler(RequestHandler):
  async def post(self):
    try:
      request = json.loads(self.request.body.decode('utf-8'))
    except Exception as e:
      print('While parsing request:', e)
      self.set_status(400)
      self.write({'details':'Request body must be formatted as a json string.'})
      return

    try:
      request['parameters'].update({'target': request['target']})
    except Exception as e:
      message = f"error parsing command: {repr(e)} - {repr(request)}"
      print(message)
      self.set_status(400)
      self.write({'details':message})
      return

    match request['command']:
      case 'nping_icmp_oneshot':
        nping_icmp_oneshot(request['parameters'])
      case 'nping_icmp_flood':
        nping_icmp_flood(request['parameters'])
      case 'tone':
        sendTone(request['parameters'])
      case 'scan':
        nmap_scan(request['parameters'])
      case 'start_ap':
        start_ap(request['parameters'])
      case 'stop_ap':
        stop_ap(request['parameters'])

class NetworksHandler(RequestHandler):
  async def get(self):
    try:
      self.write(availableNetworks())
      return
    except Exception as e:
      message = f"Error while getting available networks: {repr(e)}"
      print(message)
      self.set_status(500)
      self.write({'details':message})

class NetworkScanHandler(RequestHandler):
  async def get(self, network=None):
    try:
      if not network:
        self.set_status(400)
        self.write({'details': 'URI missing network'})
        return

      if not (targets := await IOLoop.current().run_in_executor(
        None,
        lambda: threadedScan(network)
      )):
        self.set_status(404)
        self.write({'details': f'Network {network} has no valid targets'})
        return

      self.write({'targets': targets})
      return
    except Exception as e:
      message = f"Error while scanning network {network} for targets: {repr(e)}"
      print(message)
      self.set_status(500)
      self.write({'details': message})

class TargetHandler(RequestHandler):
  async def get(self, target=None):
    try:
      if not target:
        self.set_status(400)
        self.write({'details': 'URI missing target'})
        return

      response = await IOLoop.current().run_in_executor(
        None,
        lambda: session.get(
          url=f"http://{target}/?resource=state",
          timeout=(2,2)
        )
      )
      state = response.json()
      state['online'] = True
    except:
      state['online'] = False
      pass
    # print('state of target:%s - %s' % (target, repr(state)))
    self.write(state)

class AccessPointHandler(RequestHandler):
  async def get(self):
    try:
      if not (target := self.get_query_argument('target', None)):
        self.set_status(400)
        self.write({'details': 'Missing required argument: target'})
        return

      response = await IOLoop.current().run_in_executor(
        None,
        lambda: session.get(
          url=f"http://{target}/?resource=aps",
          timeout=(2,2)
        )
      )
      aps={}
      aps['aps'] = response.json()
      aps['online'] = True
    except:
      aps['online'] = False
      pass
    # print('state of target:%s - %s' % (target, repr(state)))
    self.write(aps)

class MainHandler(RequestHandler):
  async def get(self):
    self.set_status(200)
    self.render('index.html')
  # async def post(self):

  #   match action := self.get_query_argument('action', None):

  #     case 'get_targets':
  #       if not (network := self.get_query_argument('network', None)):
  #         self.set_status(404)
  #         return

  #       if not (targets := await IOLoop.current().run_in_executor(
  #         None,
  #         lambda: threadedScan(network)
  #       )):
  #         self.set_status(404)
  #         return

  #       self.write(targets)
  #       return

  #     case 'get_state':
  #       target = None
  #       try:
  #         body = json.loads(self.request.body.decode('utf-8'))
  #         if 'target' in body:
  #           target = body['target']
  #       except:
  #         print('While parsing request:', e)
  #         self.set_status(400)
  #         return

  #       try:
  #         response = await IOLoop.current().run_in_executor(
  #           None,
  #           lambda: session.get(
  #             url=f"http://{target}/?resource=state",
  #             timeout=(2,2)
  #           )
  #         )
  #         state = response.json()
  #         state['online'] = True
  #       except:
  #         state['online'] = False
  #         pass
  #       # print('state of target:%s - %s' % (target, repr(state)))
  #       self.write(state)

  #     case 'get_aps':
  #       target = None
  #       try:
  #         body = json.loads(self.request.body.decode('utf-8'))
  #         if 'target' in body:
  #           target = body['target']
  #       except:
  #         print('While parsing request:', e)
  #         self.set_status(400)
  #         return
  #       # print('target: %s' % target)
  #       aps = {}
  #       try:
  #         response = await IOLoop.current().run_in_executor(
  #           None,
  #           lambda: session.get(
  #             url=f"http://{target}/?resource=aps",
  #             timeout=(2,2)
  #           )
  #         )
  #         aps['aps'] = response.json()
  #         aps['online'] = True
  #       except:
  #         aps['online'] = False
  #         pass
  #       # print('aps sniffed on target %s - %s' % (target,repr(aps)))
  #       self.write(aps)

  #     case _:
  #       try:
  #         request = json.loads(self.request.body.decode('utf-8'))
  #       except Exception as e:
  #         print('While parsing request:', e)
  #         self.set_status(400)
  #         return

  #       if 'set' in request:
  #         try:
  #           result = await IOLoop.current().run_in_executor(
  #             None,
  #             lambda: session.post(
  #               url=f"http://{request['target']}" ,
  #               data=json.dumps({"set": request['set']})
  #             )
  #           )
  #           self.set_status(result.status_code)
  #           return
  #         except Exception as e:
  #           self.set_status(500)
  #           return
  #           # print('Setting parameters for %s:' % request['target'], e)

  #       if 'command' in request:
  #         parameters={}
  #         try:
  #           command = request['command']
  #           target = request['target']
  #           parameters = request['parameters']
  #           parameters['target'] = target
  #         except Exception as e:
  #           print(f"error parsing command: {repr(e)} - {repr(request)} ")
  #         if command == 'nping_icmp_oneshot':
  #           nping_icmp_oneshot(parameters)
  #         elif command == 'nping_icmp_flood':
  #           nping_icmp_flood(parameters)
  #         elif command == 'tone':
  #           sendTone(parameters)
  #         elif command == 'scan':
  #           nmap_scan(parameters)
  #         elif command == 'start_ap':
  #           start_ap(parameters)
  #         elif command == 'stop_ap':
  #           stop_ap(parameters)

class DefaultHandler(RequestHandler):
  def prepare(self):
    self.set_status(404)

#===========================================================================
# Start and stop Access Point

def start_ap(parameters):
  try:
    # print('start_ap:',parameters)
    IOLoop.current().run_in_executor(
      None,
      lambda: session.post(
        url=f"http://{parameters['target']}",
        data=json.dumps({"action": "start_ap", "parameters" : parameters})
      )
    )
  except Exception as e:
    print(f"While setting up rogue AP on {parameters['target']}: {repr(e)}")

def stop_ap(parameters):
  try:
    # print('stop_ap:',parameters)
    IOLoop.current().run_in_executor(
      None,
      lambda: session.post(
        url=f"http://{parameters['target']}",
        data=json.dumps({ "action": "stop_ap"})
      )
    )
  except Exception as e:
    print(f"While stopping rogue AP on {parameters['target']}: {repr(e)}")

#===========================================================================
# Executed when run as stand alone

def signalHandler(signum, frame):
  print('\n[!] Caught termination signal: ', signum)
  try:
    main_loop.stop()
  except Exception as e:
    print('Oh dang! %s' % repr(e))
  finally:
    print('Peace out!')
    sys.exit(0)

def make_app():
  settings = dict(
    template_path = os.path.join(path, 'templates'),
    static_path = os.path.join(path, 'static'),
    default_handler_class = DefaultHandler,
    debug = debug
  )
  urls = [
    (r'/', MainHandler),
    (r'/set', SetHandler),
    (r'/run', RunHandler),
    (r'/networks', NetworksHandler),
    (r'/network-scan/(.*)', NetworkScanHandler),
    (r'/target/(.*)', TargetHandler),
    (r'/access-point', AccessPointHandler)
  ]
  return Application(urls, **settings)

if __name__ == "__main__":

  signal(SIGINT, signalHandler)
  signal(SIGTERM, signalHandler)
  signal(SIGHUP, signalHandler)

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
