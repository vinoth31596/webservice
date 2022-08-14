sleep 30
sudo yum update -y
sudo yum install git -y
sudo amazon-linux-extras install epel
sudo yum install -y gcc gcc-c++ make openssl-devel git
curl -O https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
. ~/.nvm/nvm.sh
curl -sL https://rpm.nodesource.com/setup_14.x | sudo -E bash - 
sudo yum install -y nodejs 
sudo yum install ruby -y
sudo yum install wget -y
sudo npm install -g pm2
cd /home/ec2-user
wget https://aws-codedeploy-us-east-2.s3.us-east-2.amazonaws.com/latest/install
chmod +x ./install
sudo ./install auto
sudo service codedeploy-agent start
mkdir /home/ec2-user/baseapplication
chown ec2-user:ec2-user /home/ec2-user/baseapplication
wget https://s3.us-east-2.amazonaws.com/amazoncloudwatch-agent-us-east-2/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm