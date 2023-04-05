#!/bin/bash
gnome-terminal -- java -Dcantaloupe.config=./bitem/static/vendor/cantaloupe-5.0.5/cantaloupe.properties -Xmx2g -jar ./bitem/static/vendor/cantaloupe-5.0.5/cantaloupe-5.0.5.jar
python3 ./runserver.py

