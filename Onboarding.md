# ml api adapter Setup

***

### Introduction 
In this document we'll walk through the setup for the Mojaloop ml api adapter. It consists of three sections:

* [Software List](#software-list)
* [Setup](#setup)
* [Errors On Setup](#errors-on-setup)

***

### Software List
1. Github
2. brew
3. Docker
4. Postman
5. nvm
6. npm
7. Zenhub
8. central_ledger
9. JavaScript IDE
***

### Setup
Make sure you have access to [Mojaloop on Github](https://github.com/mojaloop/ml-api-adapter) and clone the project.

#### Installing brew
##### macOS
```
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

##### Ubuntu
To install Linuxbrew, follow these [instructions](http://linuxbrew.sh/#install-linuxbrew)

#### Installing Docker
To install Docker, follow these instructions: [Docker for Mac](https://docs.docker.com/docker-for-mac/), [Docker for Ubuntu](https://docs.docker.com/install/linux/docker-ce/ubuntu/#install-using-the-repository)


#### Installing Postman
Please, follow these instructions: [Get Postman](https://www.getpostman.com/postman)

Alternatively on **Ubuntu** you may run:
```
wget https://dl.pstmn.io/download/latest/linux64 -O postman.tar.gz
sudo tar -xzf postman.tar.gz -C /opt
rm postman.tar.gz
sudo ln -s /opt/Postman/Postman /usr/bin/postman
```

##### Setup Postman
* open *Postman*
* click **Import** and then **Import File**
* navigate to the central_ledger directory and select [postman.json](./postman.json)

#### nvm
If you don't have cURL already installed, on **Ubuntu** run `sudo apt install curl`

Download the nvm install script via cURL:
```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.0/install.sh | bash
```
* Ensure that nvm was installed correctly with `nvm --version`, which should return the version of nvm installed
* Install the version (8.9.4 current LTS) of Node.js you want:
  * Install the latest LTS version with `nvm install --lts`
  * Use the latest LTS verison with `nvm use --lts`
  * Install the latest version with `nvm install node`
  * Use the latest version with `nvm use node`
  * If necessary, fallback to `nvm install 8.9.4` and `nvm use 0.33.6`

##### Setup nvm
Create a *.bash_profile* file with `touch ~/.bash_profile`, then `nano ~/.bash_profile` and *write*:
```
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" # This loads nvm
```

#### npm
By installing *node* during *nvm* installation above, you should have the correspoding npm version installed

#### Installing ZenHub for GitHub
Open Google Chrome browser and navigate to [Zenhub Extension](https://chrome.google.com/webstore/detail/zenhub-for-github/ogcgkffhplmphkaahpmffcafajaocjbd)

#### Installing central_ledger
* **cd** into the ml-api-adapter project and run subsequently the following commands:
```
npm install -g node-gyp
brew install libtool autoconf automake
npm install
source ~/.bash_profile
npm rebuild

```
* run `npm start` *(to run it locally)* or `npm run dev` *(to run it on your Docker host)*

##### Run Postman
* click on **ml api adapter** and then **POST transfer**
* click **Send**
* if you get a valid response, you should be ready to go

### Errors On Setup
* sodium v1.2.3 can't compile during npm install
  - resolved by installing v2.0.3 `npm install sodium@2.0.3`
