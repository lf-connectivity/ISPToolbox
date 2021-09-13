import sys
import configparser

def main():

    base_config = configparser.ConfigParser()
    base_config.read(sys.argv[1])

    overrides = configparser.ConfigParser()
    overrides.read(sys.argv[2])

    for section in overrides.sections():
        if section not in base_config:
            base_config.add_section(section)
        for key in overrides[section]:
            base_config[section][key] = overrides[section][key]

    base_config.write(sys.stdout)
    with open(sys.argv[3], 'w') as f:
        base_config.write(f)

if __name__ == '__main__':
    main()