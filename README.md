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

1. make sure the new settings check out: `sudo visudo -c`
1. create a group `tinyDragon`: `sudo groupadd tinyDragon`
1. set primary group for "user" to "toe": `usermod -g tinyDragon user`
1. login to `user`: `su user`
1. enable auto-login:
	1. `sudo raspi-config`
	1. select "1 System Options"
	1. select "S5 Boot / Auto Login"
	1. select "B2 Console Autologin"
	1. select "5 Localization Options"
	1. select "L4 WLAN Country"
	1. select the appropriate country...
	1. select "Finish"
	1. select "No" to continue setup
1. return to your `me` user: ctrl+d
 
### Satisfy Dependencies

The kiosk will run on Openbox, which uses xServer. Chromium browser will be served in the window and access the Theories of Everything hosted on a local server built on the Tornado Web Framework for Python.

`sudo apt-get update && sudo apt-get upgrade -y && sudo apt-get install -y wireguard git python3-pyaudio python3-tornado python3-decouple`

### Disable the splash and console text:

1. `sudo nano /boot/config.txt`
1. Enable HDMI hot plug.
1. Add as the last line: `disable_splash=1`
1. `sudo nano /boot/cmdline.txt`
1. Add to the end of the first line: `consoleblank=0 logo.nologo quiet loglevel=0 plymouth.enable=0  plymouth.ignore-serial-consoles splash fastboot noatime nodiratime noram`

[source](https://ampron.eu/article/tutorial-simplest-way-to-remove-boot-text-on-the-raspberry-pi-based-kiosk-or-digital-signage-display/)

### Customize MOTD:

1. disable scripts to generate messages: `sudo chmod -x /etc/update-motd.d/*`
1. create a backup: `sudo cp /etc/motd /etc/motd.bak`
1. modify: `sudo nano /etc/motd`

```
tinyDragonPrey
Phillip David Stearns 2023

```

### Setup Wireguard

1. `cd`
1. `mkdir .wireguard`
1. `cd .wiregaurd`
1. `umask 077`
1. `wg genkey | tee privatekey | wg pubkey > publickey`
1. `sudo nano /etc/wireguard/wg0.conf`

1. Create on Client:

```
[Interface]
Address = 10.0.0.100/32
PrivateKey = <client_private_key>

[Peer]
#Name = <server_name>
Endpoint = <server_ip>:<listening_port>
PublicKey = <server_public_key>
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 20
```

1. Add on Server:

```
[Peer]
# Name = tinyDragonPrey-04
PublicKey = <client_public_key>
AllowedIPs = 10.0.0.100/32
PersistentKeepalive = 20
```

ON SERVER

1. `sudo systemctl restart wg-quick@wg0.service` 

ON CLIENT

1. `sudo systemctl enable wg-quick@wg0.service`
1. `sudo reboot`

### Download/Install

1. `git clone`
1. `add application directory to path`

### Start on boot

1. Press `crtl+d` to return to the user `user`.
1. Return to the home directory for user `user`: `cd`
1. `nano .profile` and add:

```
sudo tinyDragonPrey
```
