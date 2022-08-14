#!/bin/bash

echo 'Starting after installation process'

echo 'After Install Script'


# stoping all services
sudo chown ec2-user:ec2-user /home/ec2-user/baseapplication
cd /home/ec2-user/baseapplication
npm -f install

sudo systemctl start amazon-cloudwatch-agent.service
