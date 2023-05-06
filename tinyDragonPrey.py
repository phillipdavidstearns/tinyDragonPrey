#!/usr/bin/env python3

import os
import sys
from signal import *
from decouple import config
from logging import getLogger

import subprocess

from tornado.web import Application, RequestHandler, StaticFileHandler
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
import json

from dragon import *

path = os.path.dirname(os.path.abspath(__file__))
debug = True

#===========================================================================
# Signal Handler / shutdown procedure

def signalHandler(signum, frame):
  print('\n[!] Caught termination signal: ', signum)
  shutdown()

def shutdown():
  try:
    main_loop.stop()
    tinyDragon.stop()
  except Exception as e:
    print('Oh dang! %s' % repr(e))
  finally:
    print('Peace out!')
    sys.exit(0)

#===========================================================================


def startRogueAP(parameters):
  try:
    # stop monitor mode
    if wlan1_monitor_mode:
      setMonitorMode(False)
    
    # use provided MAC, if none, pick a random one
    if parameters['MAC']:
      MAC = parameters['MAC']
    else:
      MAC = os.urandom(6).hex()

    #format the MAC Address to spoof
    MAC = '%s:%s:%s:%s:%s:%s' % (MAC[:2],MAC[2:4],MAC[4:6],MAC[6:8],MAC[8:10],MAC[10:12])

    subprocess.run(
      ["ip","link","set","wlan1","down"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )
    
    #spoof the address  
    subprocess.run(
      ["ip","link","set","wlan1","address", MAC],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )

    subprocess.run(
      ["ip","link","set","wlan1","up"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )

    subprocess.run(
      ["systemctl","stop","hostapd"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )

    # write new config from parameters
    config = hostapdConfTemplate.format(ssid=parameters['SSID'],channel=parameters['channel'])
    f = open('/etc/hostapd/hostapd.conf','w')
    f.write(config)
    f.close()

    #start the AP if we're lucky...
    subprocess.run(
      ["systemctl","start","hostapd"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )
  except Exception as e:
    pass

def stopRogueAP():
  try:
    subprocess.run(
      ["systemctl","stop","hostapd"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )
    if wlan1_monitor_mode:
      setMonitorMode(True)
  except:
    pass

def setMonitorMode(enable):

  if enable:
    subprocess.run(
      ["ip","link","set","wlan1","down"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )
    subprocess.run(
      ["iwconfig","wlan1","mode","monitor"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )
    subprocess.run(
      ["ip","link","set","wlan1","up"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )
  else:
    subprocess.run(
      ["ip","link","set","wlan1","down"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )
    subprocess.run([
      "iwconfig","wlan1","mode","managed"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )
    subprocess.run(
      ["ip","link","set","wlan1","up"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )

def checkWlan1Mode():
  output = str(subprocess.check_output(["iwconfig","wlan1"]))
  index = output.find("Mode:")
  index += len("Mode:")
  char=""
  mode=""
  while char != " ":
    char = output[index]
    if char != " ":
      mode+=char
    index+=1
  return mode == "Monitor"

def checkWlan1Channel():
  output = str(subprocess.check_output(["iwconfig","wlan1"]))
  output = str(output)
  index = output.find("Frequency:")
  index += len("Frequency:")
  char=""
  freq=""
  channel=0
  
  while char != " ":
    char = output[index]
    if char != " ":
      freq+=char
    index+=1

  if freq == "2.412":
    channel=1
  elif freq == "2.417":
    channel=2
  elif freq == "2.422":
    channel=3
  elif freq == "2.427":
    channel=4
  elif freq == "2.432":
    channel=5
  elif freq == "2.437":
    channel=6
  elif freq == "2.442":
    channel=7
  elif freq == "2.447":
    channel=8
  elif freq == "2.452":
    channel=9
  elif freq == "2.457":
    channel=10
  elif freq == "2.462":
    channel=11
  elif freq == "2.467":
    channel=12
  elif freq == "2.472":
    channel=13
  elif freq == "2.484":
    channel=14

  return channel

#===========================================================================
# Request handlers

class DefaultHandler(RequestHandler):
  def prepare(self):
    self.set_status(404)

class MainHandler(RequestHandler):
  async def get(self):
    resource = self.get_query_argument('resource', None)
    if resource == "state":
      writerState = await IOLoop.current().run_in_executor(
        None,
        lambda: tinyDragon.writer.getState()
      )
      state={
        "print" : writerState['enabled'],
        "color" : writerState['color'],
        "control_characters" : writerState['control_characters'],
        "color_shift" : writerState['shift'],
        "wlan1_monitor_mode" : checkWlan1Mode(),
        "wlan1_channel" : checkWlan1Channel()
      }
      self.write(state)
    elif resource == "aps":
      APs = await IOLoop.current().run_in_executor(None, lambda: tinyDragon.sockets.getAPs())
      self.write(APs)
    else:
      self.write('<p>HOORAY! YOU DID IT!</p>')
  async def post(self):
    command = None
    try:
      command = json.loads(self.request.body.decode('utf-8'))
    except Exception as e:
      self.set_status(400)
    if command:
      if 'set' in command:
        parameter = command['set']['parameter']
        value = command['set']['value']
        if parameter == "print":
          await IOLoop.current().run_in_executor(
            None,
            lambda: tinyDragon.writer.printEnable(value)
          )
        elif parameter == "color":
          await IOLoop.current().run_in_executor(
            None,
            lambda: tinyDragon.writer.colorEnable(value)
          )
        elif parameter == "control_characters":
          await IOLoop.current().run_in_executor(
            None,
            lambda: tinyDragon.writer.ctlCharactersEnable(value)
          )
        elif parameter == "color_shift":
          await IOLoop.current().run_in_executor(
            None,
            lambda: tinyDragon.writer.setColorShift(int(value))
          )
        elif parameter == "wlan1_monitor_mode":
          global wlan1_monitor_mode
          wlan1_monitor_mode = value
          await IOLoop.current().run_in_executor(
            None,
            lambda: setMonitorMode(wlan1_monitor_mode)
          )
          if wlan1_monitor_mode:
            await IOLoop.current().run_in_executor(
              None,
              lambda: subprocess.run(
                ["iwconfig","wlan1","channel",str(max(1,min(14,wlan1_channel)))],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
              )
            )
        elif parameter == "wlan1_channel":
          global wlan1_channel
          wlan1_channel = int(value)
          await IOLoop.current().run_in_executor(
            None,
            lambda: subprocess.run(
              ["iwconfig","wlan1","channel",str(max(1,min(14,wlan1_channel)))],
              stdout=subprocess.DEVNULL,
              stderr=subprocess.DEVNULL
            )
          )
      elif 'action' in command:
        action = command['action']
        if action == 'start_ap':
          IOLoop.current().run_in_executor(
            None,
            startRogueAP,
            command['parameters']
          )
        elif action == 'stop_ap':
          IOLoop.current().run_in_executor(
            None,
            stopRogueAP
          )

#===========================================================================
# Executed when run as stand alone

def make_app():
  settings = dict(
    debug = debug
  )
  urls = [
    (r'/', MainHandler)
  ]
  return Application(urls, **settings)

if __name__ == "__main__":
  templatePath = os.path.dirname(os.readlink(__file__))
  f = open(os.path.join(templatePath,'hostapd-conf.template'))
  hostapdConfTemplate = f.read()
  f.close()
  try:
    signal(SIGINT, signalHandler)
    signal(SIGTERM, signalHandler)
    signal(SIGHUP, signalHandler)

    INTERFACES=config('INTERFACES')
    DEVICE=config('DEVICE', default=0, cast=int)
    CHUNK=config('CHUNK', default=1024, cast=int)
    RATE=config('RATE', default=44100, cast=int)
    WIDTH=config('WIDTH',default=1,cast=int)
    PRINT=config('PRINT', default=False, cast=bool)
    COLOR=config('COLOR', default=False, cast=bool)
    CONTROL_CHARACTERS =config('CONTROL_CHARACTERS', default=True, cast=bool)

    tinyDragon = Dragon(
      INTERFACES=INTERFACES,
      DEVICE=DEVICE,
      CHUNK=CHUNK,
      RATE=RATE,
      WIDTH=WIDTH,
      PRINT=PRINT,
      COLOR=COLOR,
      CONTROL_CHARACTERS=CONTROL_CHARACTERS
    )

    wlan1_monitor_mode = checkWlan1Mode()
    wlan1_channel = checkWlan1Channel()

    # run the main loop
    getLogger('tornado.access').disabled = True
    application = make_app()
    http_server = HTTPServer(application)
    http_server.listen(80)
    main_loop = IOLoop.current()
    main_loop.run_in_executor(None, tinyDragon.start)
    main_loop.start()
  except Exception as e:
    print('Ooops!',e)
