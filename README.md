# tinyDragonPrey Setup for NOT.GLI.TC/H 2023

## Resources:

[Setup a Raspberry Pi to run a Web Browser in Kiosk Mode](https://die-antwort.eu/techblog/2017-12-setup-raspberry-pi-for-kiosk-mode/)

## You'll Need:

1. Raspberry Pi 3B+ and power supply
1. Monitor with HDMI connection and HDMI cable
1. A way to connect the Raspberry Pi to the internet (ethernet cable or wifi) via your local network

## Process:

### Flashing

With Raspi OS Bullseye, everything changed regarding setup...

1. [Download and install the Imager](https://www.raspberrypi.com/software/)
1. Choose Raspi OS Lite
1. Choose the SD card to flash
1. Click the Settings icon (gear)
1. Configure:
	1. hostname: ""
	1. username: ""
	1. password
	1. enable `ssh` and restrict to keys for host machine
	1. configure wifi settings
	1. configure locale settings
1. Flash, insert card, boot.
  
### Configuring users

We need to setup a general user for the device to boot into and auto login, "toe". If the kiosk is escaped or crashes to the command line, we want this user to be able to restart the application or reboot, but not much else. We also want to setup an admin user, "admin" that will have the ability to use `sudo`, but not `sudo su`.

1. login: `ssh me@tinyDragonPrey-0X` 
1. Create a new "user" user: `sudo useradd -m user`
1. Create a password for the "user" user: `sudo passwd user`
1. Create a new "admin" user: `sudo useradd -m admin`
1. Create a password for the "admin" user: `sudo passwd admin`
1. Run `sudo visudo` and modify to match:

```
#
# This file MUST be edited with the 'visudo' command as root.
#
# Please consider adding local content in /etc/sudoers.d/ instead of
# directly modifying this file.
#
# See the man page for details on how to write a sudoers file.
#
Defaults        env_reset
Defaults        timestamp_timeout=0
Defaults        mail_badpass
Defaults        secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Host alias specification

# User alias specification

# Cmnd alias specification

# User privilege specification
root    ALL=(ALL:ALL) ALL
user    ALL = NOPASSWD: /sbin/reboot, /usr/sbin/shutdown, /usr/local/bin/tinyDragonPrey
admin   ALL = (ALL) NOPASSWD: ALL, !/bin/su

# Allow members of group sudo to execute any command
%sudo   ALL=(ALL:ALL) ALL
%tinyDragon    ALL = /bin/raspi-config

# See sudoers(5) for more information on "@include" directives:

@includedir /etc/sudoers.d
```
1. create a group `tinyDragon`: `sudo groupadd tinyDragon`
1. set primary group for "user" to "toe": `usermod -g tinyDragon user`
1. login to `user`: `su user`
1. enable auto-login:
	1. `sudo raspi-config`
	1. select "1 System Options"
	1. select "S5 Boot / Auto Login"
	1. select "B2 Console Autologin"
	1. select "Finish"
	1. select "No" to continue setup
1. return to your `me` user: ctrl+d
 
### Satisfy Dependencies

The kiosk will run on Openbox, which uses xServer. Chromium browser will be served in the window and access the Theories of Everything hosted on a local server built on the Tornado Web Framework for Python.

1. `sudo apt-get update && sudo apt-get upgrade -y`
1. `sudo apt-get install --no-install-recommends xserver-xorg x11-xserver-utils xinit openbox`
1. `sudo apt-get install python3-tornado python3-pyaudio wireguard`

### Disable the splash and console text:

1. `sudo nano /boot/config.txt`
1. Enable HDMI hot plug.
1. Add as the last line: `disable_splash=1`
1. `sudo nano /boot/cmdline.txt`
1. Add to the end of the first line: `consoleblank=0 logo.nologo quiet loglevel=0 plymouth.enable=0 vt.global_cursor_default=0 plymouth.ignore-serial-consoles splash fastboot noatime nodiratime noram`

[source](https://ampron.eu/article/tutorial-simplest-way-to-remove-boot-text-on-the-raspberry-pi-based-kiosk-or-digital-signage-display/)

### Customize MOTD:

1. disable scripts to generate messages: `sudo chmod -x /etc/update-motd.d/*`
1. create a backup: `sudo cp /etc/motd /etc/motd.bak`
1. modify: `sudo nano /etc/motd`

```
tinyDragonPrey
Phillip David Stearns 2023

```

### Download/Install

1. `git clone`
1. `add application directory to path`

### Start on boot

1. Press `crtl+d` to return to the user `user`.
1. Return to the home directory for user `user`: `cd`
1. `nano .profile` and add:

```
sudo tinyDragonPrey.py
```

### Setting up the Web Application

A bare-bones web application:

```
#!/usr/bin/python3

import os
from tornado.web import Application, RequestHandler
from tornado.ioloop import IOLoop
	
#=======================================================================================
# TORNADO HANDLERS

class MainHandler(RequestHandler):
	def get(self):
		self.render("index.html")

#=======================================================================================
# TORNADO APPLICATION BUILDER

def make_app():
	settings = dict(
		template_path = os.path.join(os.path.dirname(__file__), 'templates'),
		static_path = os.path.join(os.path.dirname(__file__), 'static'),
	)
	urls = [
		(r'/', MainHandler),
	]
	return Application(urls, **settings)

if __name__ == "__main__":
	try:
		
		application = make_app()
		application.listen(80)
		main_loop = IOLoop.current()
		main_loop.start()
	except Exception as e:
		print(e)
	finally:
		main_loop.stop()
		exit()
```
