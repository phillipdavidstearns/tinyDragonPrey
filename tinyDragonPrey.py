#!/usr/bin/env python3

import os
import sys
from signal import *
from decouple import config
import logging
from logging import getLogger

import subprocess

from tornado.web import Application, RequestHandler, StaticFileHandler
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
import json

from dragon import *

#===========================================================================
# Signal Handler / shutdown procedure

def signalHandler(signum, frame):
  logging.info(f'\nCaught termination signal: {signum}')
  shutdown()

def shutdown():
  try:
    IOLoop.current().stop()
    tinyDragon.stop()
  except Exception as e:
    logging.error(f'Oh dang! {repr(e)}')
  finally:
    logging.info('Peace out!')
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
    MAC = f'{MAC[:2]}:{MAC[2:4]}:{MAC[4:6]}:{MAC[6:8]}:{MAC[8:10]}:{MAC[10:12]}'

    subprocess.run(
      ["ip", "link", "set", "wlan1", "down"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )
    
    #spoof the address  
    subprocess.run(
      ["ip", "link", "set", "wlan1", "address", MAC],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )

    subprocess.run(
      ["ip", "link", "set", "wlan1", "up"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )

    subprocess.run(
      ["systemctl", "stop", "hostapd"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )

    # write new config from parameters
    config = hostapdConfTemplate.format(
      ssid=parameters['SSID'],
      channel=parameters['channel']
    )
    f = open('/etc/hostapd/hostapd.conf','w')
    f.write(config)
    f.close()

    #start the AP if we're lucky...
    subprocess.run(
      ["systemctl", "start", "hostapd"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )
  except Exception as e:
    pass

def stopRogueAP():
  try:
    subprocess.run(
      ["systemctl", "stop", "hostapd"],
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
  char = ""
  mode = ""
  while char != " ":
    char = output[index]
    if char != " ":
      mode+=char
    index+=1
  return mode == "Monitor"

def checkWlan1Channel():
  output = str(subprocess.check_output(["iwconfig", "wlan1"]))
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

  match freq:
    case "2.412":
      channel=1
    case "2.417":
      channel=2
    case "2.422":
      channel=3
    case "2.427":
      channel=4
    case "2.432":
      channel=5
    case "2.437":
      channel=6
    case "2.442":
      channel=7
    case "2.447":
      channel=8
    case "2.452":
      channel=9
    case "2.457":
      channel=10
    case "2.462":
      channel=11
    case "2.467":
      channel=12
    case "2.472":
      channel=13
    case "2.484":
      channel=14
    case _:
      channel=1

  return channel

#===========================================================================

async def getState():
  if not (writerState := await IOLoop.current().run_in_executor(
    None,
    tinyDragon.get_writer_state
  )):
    return None

  return {
    "print" : writerState['enabled'],
    "color" : writerState['color'],
    "linebreaks" : writerState['linebreaks'],
    "color_shift" : writerState['shift'],
    "wlan1_monitor_mode" : checkWlan1Mode(),
    "wlan1_channel" : checkWlan1Channel()
  }

#===========================================================================
# Request handlers

class DefaultHandler(RequestHandler):
  def prepare(self):
    self.set_status(404)

class MainHandler(RequestHandler):
  async def get(self):
    resource = self.get_query_argument('resource', None)

    match resource:
      case "state":
        if not (state := await getState()):
          self.set_status(400)
          return
        self.write(state)
      case "aps":
        APs = await IOLoop.current().run_in_executor(
          None,
          tinyDragon.sockets.getAPs
        )
        self.write(APs)
      case _:
        self.set_status(400)
        self.write({'details':'unrecognized argument value / BAD REQUEST'})
  async def post(self):
    command = None
    try:
      command = json.loads(self.request.body.decode('utf-8'))
    except Exception as e:
      self.set_status(400)
      self.write({'details': 'missing required body argument: command'})
      return

    if 'set' in command:
      match command['set']['parameter']:
        case "print":
          await IOLoop.current().run_in_executor(
            None,
            lambda: tinyDragon.writer.printEnable(command['set']['value'])
          )
        case "color":
          await IOLoop.current().run_in_executor(
            None,
            lambda: tinyDragon.writer.colorEnable(command['set']['value'])
          )
        case "linebreaks":
          await IOLoop.current().run_in_executor(
            None,
            lambda: tinyDragon.writer.ctlCharactersEnable(command['set']['value'])
          )
        case "color_shift":
          await IOLoop.current().run_in_executor(
            None,
            lambda: tinyDragon.writer.setColorShift(int(command['set']['value'])),
          )
        case "wlan1_monitor_mode":
          global wlan1_monitor_mode
          wlan1_monitor_mode = command['set']['value']
          await IOLoop.current().run_in_executor(
            None,
            lambda: setMonitorMode(wlan1_monitor_mode)
          )
          if wlan1_monitor_mode:
            await IOLoop.current().run_in_executor(
              None,
              lambda: subprocess.run(
                ["iwconfig", "wlan1", "channel", str(max(1, min(13, wlan1_channel)))],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
              )
            )
        case "wlan1_channel":
          global wlan1_channel
          wlan1_channel = int(command['set']['value'])
          await IOLoop.current().run_in_executor(
            None,
            lambda: subprocess.run(
              ["iwconfig", "wlan1", "channel", str(max(1, min(13, wlan1_channel)))],
              stdout=subprocess.DEVNULL,
              stderr=subprocess.DEVNULL
            )
          )
      return

    if 'action' in command:
      match command['action']:
        case 'start_ap':
          IOLoop.current().run_in_executor(
            None,
            lambda: startRogueAP(command['parameters'])
          )
        case 'stop_ap':
          IOLoop.current().run_in_executor(
            None,
            stopRogueAP
          )
      return

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

  logging.basicConfig(
    level=config('LOG_LEVEL', default=20, cast=int),
    format='[TINY_DRAGON_PREY] - %(levelname)s | %(message)s'
  )

  try:
    debug = True
    templatePath = os.path.dirname(os.readlink(__file__))
    f = open(os.path.join(templatePath,'hostapd-conf.template'))
    hostapdConfTemplate = f.read()
    f.close()

    signal(SIGINT, signalHandler)
    signal(SIGTERM, signalHandler)
    signal(SIGHUP, signalHandler)

    INTERFACES=config('INTERFACES', default='eth0', cast=str)
    DEVICE=config('DEVICE', default=0, cast=int)
    CHUNK=config('CHUNK', default=1024, cast=int)
    RATE=config('RATE', default=44100, cast=int)
    WIDTH=config('WIDTH', default=1, cast=int)
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
    tinyDragon.start()

    wlan1_monitor_mode = checkWlan1Mode()
    wlan1_channel = checkWlan1Channel()

    # run the main loop
    getLogger('tornado.access').disabled = True
    application = make_app()
    http_server = HTTPServer(application)
    http_server.listen(80)
    main_loop = IOLoop.current()

    main_loop.start()

  except Exception as e:
    logging.error(f'Ooops! {repr(e)}')
  finally:
    IOLoop.current().stop()
    if tinyDragon:
      tinyDragon.stop()
    sys.exit(0)
