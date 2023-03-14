#!/bin/bash

pybabel extract -F bitem/translations/babel.cfg -k lazy_gettext -o bitem/translations/messages.pot .
#babel init -i bitem/translations/messages.pot -d bitem/translations -l de
pybabel compile -d bitem/translations
pybabel update -i bitem/translations/messages.pot -d bitem/translations/

