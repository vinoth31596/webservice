#!/bin/bash
echo 'Starting Application stop process'



# stoping all services
sudo su root
sudo pm2 stop all
sudo pm2 delete app.js
sudo pm2 save
cd /home/ec2-user/baseapplication
sudo systemctl stop node-service.service
sudo systemctl stop amazon-cloudwatch-agent.service

