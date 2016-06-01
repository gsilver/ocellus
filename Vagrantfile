# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure(2) do |config|
    config.vm.box = "ubuntu/trusty64"
    config.vm.provider "virtualbox" do |v|
        v.memory = 1024
    end

    config.vm.network "forwarded_port", guest: 8000, host: 18000
    config.vm.network "forwarded_port", guest: 80,   host: 10080

    config.vm.provision "shell", inline: <<-SHELL
        set -xe

        cd /vagrant

        echo "America/Detroit" > /etc/timezone
        dpkg-reconfigure -f noninteractive tzdata

        apt-get update
        apt-get dist-upgrade -y

        apt-get install -y libmysqlclient-dev
        debconf-set-selections <<< 'mysql-server mysql-server/root_password password MySuperPassword'
        debconf-set-selections <<< 'mysql-server mysql-server/root_password_again password MySuperPassword'
        apt-get install -y mysql-server
        mysql -u root -pMySuperPassword -e "create database OCELLUS"
        apt-get --no-install-recommends install --yes python-pip python-dev
        apt-get --no-install-recommends install --yes apache2 apache2-utils
        apt-get --no-install-recommends install --yes libldap2-dev libsasl2-dev

        cat <<EOM > /etc/apache2/sites-available/001-se_proxy.conf
<VirtualHost *:80>
        ErrorLog \${APACHE_LOG_DIR}/error.log
        CustomLog \${APACHE_LOG_DIR}/access.log combined
        ProxyPass / http://0.0.0.0:8000/
        ProxyPassReverse / http://0.0.0.0:8000/

        RequestHeader set Proxy-User "foobar"

</VirtualHost>
EOM
        a2enmod rewrite headers proxy_*

        a2dissite 000-default.conf
        a2ensite 001-se_proxy.conf

        service apache2 restart

        pip install coverage
        pip install -r requirements.txt

        echo "Installing Bower..."
        cd /vagrant
        apt-get update
        apt-get install --yes git
        curl --silent --location https://deb.nodesource.com/setup_4.x | sudo bash -
        apt-get install --yes nodejs
        npm install --global npm@latest
        npm install --global bower
        npm install -g grunt-cli
        npm install --global grunt
    SHELL
    config.vm.provision "shell", run: 'always',inline: <<-SHELL2
    cd /vagrant/mbofui
    npm install
    grunt dev
    SHELL2
end
