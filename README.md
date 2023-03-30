# tinyDragonPrey for NOT.GLI.TC/H 2023

## What's going on here?

1. Nothing
2. It's complicated...
3. OK... So, here's everything you "need" to know:

### Here Be Dragons

> ["Here Be Dragons"](https://phillipstearns.com/artwork#/here-be-dragons/) is a real-time sound piece that converts malicious intrusion attempts on internet-connected devices into an immersive soundscape.
 
In the fall of 2018, I started discussing with [Sporobole](https://sporobole.org/) director, Éric Desmarais, the possibility of producing a sound installation for EspaceImMedia (EIM) 2019 / LISTENING ANGLES: SOUND PIECES IN PUBLIC SPACE. In July of 2019, I was invited to produce Here Be Dragons as an artist in residence at Sporobole.

The concept for the piece was broadly aimed at translating cyber warfare into the sensorial sphere of human perception. Cyber warfare has several key aspects, one of which is leveraging software flaws on networked systems. So much of the infrastructure and by extension the activity on modern communication networks and networked information systems is silent, and invisible. How then do we access this activity and develop sensibilities beyond abstract conceptual awareness?

Imagine that you cannot see. You are in an unfamiliar forest. Once the disorientation and panic subside, how do you become attuned to your environment? What sensibilities and ways of knowing through your ears emerge? Can you learn to identify changes in weather based on the subtle changes to the songs of the forest?

Here Be Dragons involved three core elements:

1. Remote [Honeypot](https://en.wikipedia.org/wiki/Honeypot_(computing)) Servers
2. A VPN
3. Raspberry Pis running software to translate network packets into audio.

### tinyDragons

Here Be Dragons used 8 Raspberry Pis to convert into sound the malicious network traffic of 15 honeypot servers deployed globally. Opportunities to present the work in different contexts with fewer speakers or on headphones came up. The Raspberry Pis then became my dragons.

### packet2audio

The software translating the traffic to audio is [packet2audio](https://github.com/phillipdavidstearns/packet2audio). It's gone through several revisions and is due for another update, but the principle is simple:

Open a raw socket, grab available packets as they are available and feed them into an audio stream buffer.

So any network interface that can be opened as a raw socket can be hooked up to the audio interface, including wireless adapters!

### SYN/ACK 

While developing the software for Here Be Dragons, I started rehearsing with the system locally for live performances. The first of these was for [NØ SCHOOL NEVERS](https://noschoolnevers.com/2019.html). Subsequent performances were given at [CULTUREHUB's Indeterminate Forms](https://www.culturehub.org/events/indeterminate-forms) and [Radical/Networks 2019](https://radicalnetworks.org/archives/2019/).

### tinyDragonPrey

Is the next evolution of the tinyDragons and a continuation of the performance SYN/ACK. It has been developed especially for [NOT.GLI.TC/H](https://not.gli.tc/h/) @ [TRITRIANGLE](https://tritriangle.net/events/event/not-gli-tc-h/).

The familiar dragons are now running tinyDragonPrey, which includes a web server that incorporates and provides some interactivity with an updated version of packet2audio.

In previous performances of SYN/ACK, port scans, vulnerability exploits, and brute force login attempts were performed from my laptop, using tools and frameworks like Metasploit directly from the command line, with only a handful of rudimentary scripts at my disposal. I would also place the tinyDragons into monitor mode and audify the ambient wifi traffic.

Part of developing tinyDragonPrey, was to create a more performance friendly interface to control the timing and nature of the attacks as well as interface with the settings for each of the tinyDragons. controlPanel.py fires up a lightweight web server that hosts the interface (HTML5+Bootstrap/CSS+JS) and passes commands to the remote dragons. Some of the controls include:

**On the tinyDragon:**

* enabling/disabling wifi interface monitor mode
* setting wifi interface channel
* enabling/disabling printing packets to the console
* enabling/disabling colorizing the background of printed characters based on the byte value represented
* setting an offset value for that background color
* deploying a rogue access point using SSIDs sniffed from probe requests while in monitor mode

**On the tinyDragon:**

* one-shot and flood ICMP pings with `nping` and custom message or waveform payloads
* launching several different flavors of `nmap` scans

Any other vulnerability scanning and exploitation will happen from the command line via metasploit, etc.

---

# The Recipe

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

### WiFi AP Setup

1. `sudo apt-get install -y hostapd dnsmasq netfilter-persistent iptables-persistent`
1. sudo systemctl unmask hostapd`
1. `sudo nano /etc/dhcpcd.conf` and add to the end:

```
interface wlan1
    static ip_address=10.10.20.1/24
    nohook wpa_supplicant
```

1. `sudo nano /etc/sysctl.d/routed-ap.conf` to enable packet forwarding

```
net.ipv4.ip_forward=1
```

1. Setup packet routing

```
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo netfilter-persistent save
```

1. configure dnsmasq: `sudo nano /etc/dnsmasq.conf`

```
interface=wlan1
dhcp-range=10.10.20.5,10.10.20.250,255.255.255.0,24h
domain=wlan
address=/gw.wlan/10.10.20.1
# Specify the default route
dhcp-option=3,10.10.20.1
# Specify the DNS server address
dhcp-option=6,10.10.20.1
# Set the DHCP server to authoritative mode.
dhcp-authoritative
```
1. enable wifi just in case `sudo rfkill unblock wlan`
1. `sudo nano /etc/hostapd/hostapd.conf`

```
country_code=US
interface=wlan1
driver=nl80211sduo
ieee80211n=1
wmm_enabled=0
ssid=tinyDragonPrey
hw_mode=g
channel=5
macaddr_acl=0
ignore_broadcast_ssid=0
```
