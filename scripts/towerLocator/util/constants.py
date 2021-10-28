# flake8: noqa
ASR_REGISTRATION_URL = 'https://wireless2.fcc.gov/UlsApp/AsrSearch/asrRegistration.jsp'
FCC_DATA_URL = 'ftp://wirelessftp.fcc.gov/pub/uls/complete/r_tower.zip'

TYPE_MAP = {
        'B': 'Building',
        'BANT': 'Building with Antenna',
        'BMAST': 'Building with Mast',
        'BPIPE': 'Building with Pipe',
        'BPOLE': 'Building with Pole',
        'BRIDG': 'Bridge',
        'BTWR': 'Building with Tower',
        'GTOWER': 'Guyed Tower',
        'LTOWER': 'Lattice Tower',
        'MAST': 'Mast',
        'MTOWER': 'Monopole',
        'NNGTANN': 'Guyed Tower Array',
        'NNLTANN': 'Lattice Tower Array',
        'NNMTANN': 'Monopole Array',
        'PIPE': 'Pipe',
        'POLE': 'Pole',
        'RIG': 'Oil (or other rig)',
        'SIGN': 'Sign or Billboard',
        'SILO': 'Silo',
        'STACK': 'Smoke Stack',
        'TANK': 'Tank (Water, Gas, etc)',
        'TREE': 'Tree',
        'TOWER': 'Tower',
        'UPOLE': 'Utility Pole/Tower',
        'UNKN': 'Unknown',
}

# https://www.fcc.gov/sites/default/files/pubacc_asr_codes_data_elem.pdf
STATUS_CODES = {
        'A': 'Cancelled',
        'C': 'Constructed',
        'D': 'Dismissed',
        'G': 'Granted',
        'I': 'Dismantled',
        'N': 'Inactive',
        'O': 'Owner removed',
        'P': 'Pending',
        'R': 'Returned',
        'T': 'Terminated',
        'W': 'Withdrawn',
        'UNKN': 'Unknown'
}

def get_tower_url(unique_identifier):
        return f'{ASR_REGISTRATION_URL}?regKey={unique_identifier}'