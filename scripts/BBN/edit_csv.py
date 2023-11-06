# (c) Meta Platforms, Inc. and affiliates. Copyright
"""
Script to preprocess CSV files from BroadbandNow data. The script does three things:

1. Eliminates duplicate entries
2. Eliminates incomplete rows (think something like ",,,,,,")
3. Left pads block_ids with 0s if the block_id is less than 15 characters long.

This is to make importing data easier.

Usage: edit_csv.py <csv files>
Output: example.csv -> example_edited.csv
"""


import csv
import sys
import glob

OUTFILE = 'bbn.csv'
BLOCK_IDS = set()


def process_file(filename):
    infile = filename

    key_collisions = 0
    padded_block_ids = 0
    rows = 0
    rows_written = 0

    with open(infile) as f_in, open(OUTFILE, 'a') as f_out:
        csv_in = csv.reader(f_in)
        csv_out = csv.writer(f_out)

        for i, row in enumerate(csv_in):
            # Shorten rows with unnecessary trailing columns.
            newrow = row[0:7]

            # Skip header.
            if i != 0:

                # Left pad block IDs.
                padded_block_id = newrow[0].rjust(15, '0')
                if newrow[0] != padded_block_id:
                    padded_block_ids += 1
                    newrow[0] = padded_block_id

                block_id = newrow[0]

                # Sanitize incomplete rows
                if all(newrow):
                    if block_id in BLOCK_IDS:
                        key_collisions += 1
                    else:
                        BLOCK_IDS.add(block_id)
                        csv_out.writerow(newrow)
                        rows_written += 1

                rows += 1

    print(f'Finished processing {filename}')
    print(f'{key_collisions} key collisions found')
    print(f'{padded_block_ids} block_ids padded')
    print(f'{rows} rows processed')
    print(f'{rows_written} rows written\n\n')


def main():
    # Truncate output file
    f = open(OUTFILE, 'w')
    f.close()

    # Get all files from sys argv
    files = sum([glob.glob(pattern) for pattern in sys.argv[1:]], [])
    for file in files:
        process_file(file)


if __name__ == '__main__':
    main()
