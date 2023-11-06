# (c) Meta Platforms, Inc. and affiliates. Copyright
sudo apt-get update
sudo apt-get install -y python3.8 python3-pip
echo "Making python3.8 and pip3 defaults ~/.bash_aliases"
echo "alias python=python3" >> ~/.bash_aliases
echo "alias pip=pip3" >> ~/.bash_aliases
source ~/.bash_aliases
source ~/.bashrc
echo "reload terminal for changes to propagate"
