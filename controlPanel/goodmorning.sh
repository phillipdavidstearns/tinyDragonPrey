#!/bin/bash

for i in {1..3};do
	ssh 10.42.0.12$i 'sudo pkill -9 -t tty1 && sudo reboot'
done