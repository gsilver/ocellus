FROM ubuntu:14.04

MAINTAINER Kyle Dove <dovek@umich.edu>

# Fix sh to allow running of bash instead of sh
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Install dependencies
RUN apt-get update && \
apt-get dist-upgrade -y && \
apt-get install -y libmysqlclient-dev git python-pip python-dev apache2 apache2-utils libldap2-dev libsasl2-dev nodejs curl

# Install Ocellus
WORKDIR /tmp/

COPY requirements.txt /tmp/
COPY . /tmp/

#RUN git clone https://github.com/tl-its-umich-edu/ocellus.git

#WORKDIR /usr/local/ocellus/

# Install python components based on ocellus requirements file
RUN pip install coverage
RUN pip install -r requirements.txt

#Node.js stuff
RUN curl --silent --location https://deb.nodesource.com/setup_4.x | sudo bash -
RUN apt-get install --yes nodejs
RUN npm install --global npm@latest
RUN npm install --global bower

# grunt stuff
RUN npm install -g grunt-cli
RUN npm install --global grunt

RUN echo '{ "allow_root": true }' > /root/.bowerrc
RUN cd mbofui && bower install && npm install && grunt prod
#RUN cd /usr/local/ocellus/mbofui/ && bower install ui-leaflet

EXPOSE 8000

# copy settings file and launch django
CMD cp /usr/share/ocellus/settings.py ./hacks_mbof/; python manage.py migrate;./runAsUser.sh bjensen
