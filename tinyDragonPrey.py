#!/usr/bin/env python3

import os
import sys
import re
from signal import *
from decouple import config
import logging
from logging import getLogger

import subprocess

from tornado.web import Application, RequestHandler, StaticFileHandler
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.escape import json_decode

from netifaces import AF_LINK,AF_INET, ifaddresses
import socket

from rpi_dragon import Dragon

import traceback

from functools import wraps
from jinja2 import Environment, FileSystemLoader

#================================================================
# Specifically for use with Tornado

def async_wrapper(func):
  @wraps(func)
  async def run(*args, **kwargs):
    return await IOLoop.current().run_in_executor(
      None,
      lambda: func(*args, **kwargs)
    )
  return run

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

@async_wrapper
def startRogueAP(parameters):
  try:
    # use provided MAC, if none, pick a random one
    MAC = parameters['mac_address'] if parameters['mac_address'] else os.urandom(6).hex()

    # format the MAC Address to spoof
    MAC = f"{MAC[:2]}:{MAC[2:4]}:{MAC[4:6]}:{MAC[6:8]}:{MAC[8:10]}:{MAC[10:12]}"

    # render the NetworkManager connection config file
    config = networkmanager_template.render(
      interface=parameters['interface'],
      ssid=parameters['ssid'],
      ip_address=parameters['ip_address'],
      channel=parameters['channel'],
      password=parameters['password'],
      mac_address=MAC
    )

    # save the file
    filename = f"/etc/NetworkManager/system-connections/{parameters['interface']}.nmconnection"
    with open(filename, "w") as file:
      file.write(config)
    os.chmod(filename, 0o600)

    # reloads all connections, imports new config files and settings
    subprocess.run(
      ["sudo", "nmcli", "connection", "reload"],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )

    # activate the AP with the new config settings
    subprocess.run(
      ["sudo", "nmcli", "connection", "up", parameters['interface']],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )

  except Exception as e:
    logging.error(f"startRogueAP: {e}")
    pass

#----------------------------------------------------------------

@async_wrapper
def stopRogueAP(interface):
  try:
    subprocess.run(
      ["sudo", "nmcli", "connection", "down", interface],
      stdout=subprocess.DEVNULL,
      stderr=subprocess.DEVNULL
    )
  except:
    pass

#----------------------------------------------------------------

@async_wrapper
def setMonitorMode(interface, enable):

  # bring down the interface
  subprocess.run(
    ["sudo", "ip", "link", "set", interface, "down"],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
  )

  # set the interface mode
  subprocess.run(
    ["sudo", "iwconfig", interface, "mode", "monitor" if enable else "managed"],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
  )

  # bring the interface back up
  subprocess.run(
    ["sudo", "ip", "link", "set", interface, "up"],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
  )

#----------------------------------------------------------------

@async_wrapper
def setWlanChannel(interface, channel):
  subprocess.run(
    ["sudo", "iwconfig", interface, "channel", str(max(1, min(14, channel)))],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
  )

#----------------------------------------------------------------

@async_wrapper
def availableInterfaces():
  interfaces = []
  if_names = socket.if_nameindex()
  wireless_devices = getWifiDeviceInfo()
  for if_name in if_names:
    addresses = ifaddresses(if_name[1])
    wifi_check = [device for device in wireless_devices if device['interface_name'] == if_name[1]]
    wifi_device = wifi_check[0] if len(wifi_check) > 0 else None
    interfaces.append({
      "interface" : if_name[1],
      "ip_address" : addresses[AF_INET][0]['addr'] if AF_INET in addresses else None,
      "netmask" : addresses[AF_INET][0]['netmask'] if AF_INET in addresses else None,
      "mac_address" : addresses[AF_LINK][0]['addr'] if AF_LINK in addresses else None,
      "wireless_info" : wifi_device
    })
  return interfaces

#----------------------------------------------------------------

def getWifiDeviceInfo():
  devices = []

  phy_list = [
    line
    for line in subprocess.check_output(["iw", "list"]).split(b'Wiphy ')
    if len(line) > 0
  ]

  dev_list = [
    line
    for line in subprocess.check_output(["iw", "dev"]).split(b'phy#')
    if len(line) > 0
  ]

  if len(phy_list) != len(dev_list): raise Exception(f"WTH!?! different number of devs ({len(dev_list)}) and phys ({len(phy_list)})")

  for i in range(len(dev_list)):
    dev_lines = [line.decode().lstrip() for line in dev_list[i].split(b'\n')]
    device = {"index": int(dev_lines[0])}
    for line in dev_lines:
      line = line.split(' ')
      if line[0] == "Interface":
        device.update({"interface_name" : line[1]})
      if line[0] == "addr":
        device.update({"mac_address" : line[1]})

    phy_lines = [ line.decode().replace('*','').lstrip() for line in phy_list[i].split(b'\n') if len(line) > 0]
    
    channels=[]
    for line in phy_lines[phy_lines.index('Band 1:'):]:
      if match := re.match(r'.*?\[(\d{1,3})\].*?', line):
        channels.append(int(match[1]))

    index_modes = phy_lines.index('Supported interface modes:')
    index_band_1 = phy_lines.index('Band 1:')

    device.update({
      "physical_name" : phy_lines[0],
      "modes" : phy_lines[index_modes+1:index_band_1],
      "channels": channels
    })

    devices.append(device)
  return devices

#----------------------------------------------------------------

@async_wrapper
def checkWlanMode(interface):
  output = str(subprocess.check_output(["iwconfig", interface]))
  index = output.find("Mode:")
  index += len("Mode:")
  char = ""
  mode = ""
  while char != " ":
    char = output[index]
    if char != " ":
      mode+=char
    index+=1
  return mode.lower()

#----------------------------------------------------------------

@async_wrapper
def checkWlanChannel(interface):
  output = str(subprocess.check_output(["iwconfig", interface]))
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

async def get_socket_state(index):
  socket_state = tinyDragon.get_socket_state(index)

  wireless_devices = getWifiDeviceInfo()
  wifi_check = [device for device in wireless_devices if device['interface_name'] == socket_state['interface']]
  if wifi_device := wifi_check[0] if len(wifi_check) > 0 else None:
    wifi_device.update({
      'current_mode' : await checkWlanMode(socket_state['interface']),
      'current_channel' : await checkWlanChannel(socket_state['interface'])
    })
  socket_state.update({'wifi_info': wifi_device})
  return socket_state

#----------------------------------------------------------------

@async_wrapper
def get_access_points():
  return tinyDragon.get_access_points()

@async_wrapper
def get_dragon_state():
  return tinyDragon.get_state()

@async_wrapper
def set_socket_interface(index, interface):
  tinyDragon.set_socket_interface(index, interface)

#===========================================================================
# Request handlers

class BaseHandler(RequestHandler):

    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Headers", "x-requested-with")
        self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')

    def options(self):
        self.set_status(204)
        self.finish()

class DefaultHandler(RequestHandler):
  def prepare(self):
    self.set_status(404)

class MainHandler(BaseHandler):
  async def get(self):
    resource = self.get_query_argument('resource', None)

    match resource:
      case "state":
        if not (state := await get_dragon_state()):
          self.set_status(400)
          return
        interfaces = await availableInterfaces()
        state.update({"interfaces" : interfaces})
        self.write(state)
      case "interfaces":
        if not (interfaces := await availableInterfaces()):
          self.set_status(400)
          return
        self.write({"interfaces" : interfaces})
      case "interface_state":
        if not (interface := self.get_query_argument('interface', None)):
          self.set_status(400)
          return
        if not (interfaces := await availableInterfaces()):
          self.set_status(400)
          return

        matches = [iface for iface in interfaces if iface['interface'] == interface ]

        if len(matches) == 0:
          self.set_status(404)
          return

        self.write({
          'state': {
            'interface' : interface,
            'mode' : await checkWlanMode(interface),
            'channel' : await checkWlanChannel(interface)
          }
        })
      case "socket_state":
        if not (index := self.get_query_argument('index', None)):
          self.set_status(400)
          return
        if not (state := await get_socket_state(int(index))):
          self.set_status(400)
          return
        self.write({'state': state})
 
      case "aps":
        access_points = await get_access_points()
        self.write(access_points)
      case _:
        self.set_status(400)
        self.write({'details': 'unrecognized argument value / BAD REQUEST'})

  async def post(self):
    command = None
    try:
      command = json_decode(self.request.body)
    except Exception as e:
      self.set_status(400)
      self.write({'details': 'missing required body argument: command'})
      return

    match command['attribute']:
      case "print_enable":
        if tinyDragon.writer:
          tinyDragon.writer.printEnable(command['parameters']['value'])
      case "color_enable":
        if tinyDragon.writer:
          tinyDragon.writer.colorEnable(command['parameters']['value'])
      case "linebreaks_enable":
        if tinyDragon.writer:
          tinyDragon.writer.linebreaksEnable(command['parameters']['value'])
      case "color_shift":
        if tinyDragon.writer:
          tinyDragon.writer.setColorShift(int(command['parameters']['value']))
      case "socket_interface":
        await set_socket_interface(
          index = command['parameters']['index'],
          interface = command['parameters']['interface']
        )
      case "wlan_monitor_mode":
        await setMonitorMode(
          command['parameters']['interface'],
          command['parameters']['monitor']
        )
        if command['parameters']['monitor']:
          await setWlanChannel(
            command['parameters']['interface'],
            command['parameters']['channel']
          )
      case "wlan_channel":
        await setWlanChannel(
          command['parameters']['interface'],
          command['parameters']['channel']
        )
      case 'start_ap':
        await startRogueAP(command['parameters'])
      case 'stop_ap':
        await stopRogueAP(command['parameters']['interface'])
        await setMonitorMode(
          command['parameters']['interface'],
          command['parameters']['monitor']
          )
        await setWlanChannel(
          command['parameters']['interface'],
          command['parameters']['channel']
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


  logging.basicConfig(
    level=config('LOG_LEVEL', default=10, cast=int),
    format='[TINY_DRAGON_PREY] - %(levelname)s | %(message)s'
  )

  getLogger('tornado.access').disabled = True

  try:
    debug = True
    templatePath = os.path.join(
      os.path.dirname(os.path.abspath(__file__)),
      'templates'
    )

    env = Environment(loader = FileSystemLoader(
      templatePath,
      followlinks = True
    ))
    networkmanager_template = env.get_template('networkmanager-conf.jinja')

    signal(SIGINT, signalHandler)
    signal(SIGTERM, signalHandler)
    signal(SIGHUP, signalHandler)

    tinyDragon = Dragon(
      interfaces=config('INTERFACES', default=[], cast=lambda v: [s.strip() for s in v.split(',')]),
      audio_device_index=config('DEVICE', default=0, cast=int),
      chunk_size=config('CHUNK', default=1024, cast=int),
      sample_rate=config('RATE', default=44100, cast=int),
      sample_width=config('WIDTH', default=1, cast=int),
      print_enabled=config('PRINT', default=False, cast=bool),
      color_enabled=config('COLOR', default=False, cast=bool),
      linebreak_enabled=config('CONTROL_CHARACTERS', default=True, cast=bool),
      qty_channels=config('AUDIO_CHANNELS', default=2, cast=int),
      audio_only=config('AUDIO_ONLY', default=True, cast=bool),
      log_aps = True
    )
    tinyDragon.start()

    # run the main loop
    application = make_app()
    http_server = HTTPServer(application)
    http_server.listen(80)
    main_loop = IOLoop.current()
    main_loop.start()

  except Exception as e:
    logging.error(f'Ooops! {repr(e)}')
    traceback.print_exception(e)
    shutdown()
