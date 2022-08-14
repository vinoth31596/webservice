# webservice
	1. CI/CD Demo Web Application
	2. Assignment 10
	3. SSL
	4. EBS,RDS Encryption
	
# Description
	Node with express.js is used in this project to execute the project
# Framework/Modules
	1. Backend dev framework: express
	2. Testing: mocha, chai
	3. Minifier: uglify
	4. bcrypt
	5. salt
	6. basic auth
# Running the project
	1. Clone the repo
	2. Install dependencies `npm install`
	3. Run it `npm start`
# Running Test
	1. Run `npm run test`  
# Building the project

Run `npm run build`

# Packer Build

1. To run AMI build formation `packer build ami.json`

# Cloud formation Commands

 1. Create a Stack 
   
 aws cloudformation create-stack --stack-name AWS-CLI-VPC1 --template-body file://csye6225-infra.yml --parameters ParameterKey=VpcCidrBlock,ParameterValue="10.0.0.0/26" --profile DEV

 2. Delete a Stack - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/delete-stack.html

 Delete a Stack aws cloudformation delete-stack \
  --stack-name AWS-CLI-VPC1 --profile DEV

 3. Configure AWS CLI - aws configure --profile=DEMO
   
   
 4. Run Command using External Parameter File
aws cloudformation create-stack --stack-name AWS-CLI-VPC1 --template-body file://csye6225-infra.yml --parameters file://parameter.json --profile DEV

 5. aws cloudformation create-stack --stack-name AWS-CLI-VPC1 --template-body file://csye6225-infra.yml --parameters file://parameter.json --capabilities CAPABILITY_NAMED_IAM --profile DEMO --region=us-east-1
   
 6. aws cloudformation create-stack --stack-name CI-CD-STACK --template-body file://ci-cd-pipeline.yml --capabilities CAPABILITY_NAMED_IAM --profile DEMO --region=us-east-1


## Steps to import SSL Certificate

aws acm import-certificate --certificate fileb:///mnt/d/demo_vinothmani_me/demo_vinothmani_me.crt --certificate-chain fileb:///mnt/d/demo_vinothmani_me/demo_vinothmani_me.ca-bundle --private-key fileb:///mnt/d/demo_vinothmani_me/server.key\