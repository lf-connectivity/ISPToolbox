"""
Script to preprocess CSV files from BroadbandNow data. The script does three things:

1. Eliminates duplicate entries
2. Eliminates incomplete rows (think something like ",,,,,,")
3. Left pads block_ids with 0s if the block_id is less than 15 characters long.

This is to make importing data easier.

Usage: edit_csv.py <csv file>
Output: example.csv -> example_edited.csv
"""


import csv
import sys

def main():
	filename, extension = sys.argv[1].rsplit('.', 2)
	infile = sys.argv[1]
	outfile = '%s_edited.%s' % (filename, extension)

	block_ids = set()
	key_collisions = 0
	padded_block_ids = 0
	rows = 0
	rows_written = 0

	with open(infile) as f_in, open(outfile, 'w') as f_out:
		csv_in = csv.reader(f_in)
		csv_out = csv.writer(f_out)

		for i, row in enumerate(csv_in):
			# Shorten rows with unnecessary trailing columns.
			newrow = row[0:7]

			# Don't do anything to header
			if i == 0:
				csv_out.writerow(newrow)
			else:

				# Left pad block IDs.
				padded_block_id = newrow[0].rjust(15, '0')
				if newrow[0] != padded_block_id:
					padded_block_ids += 1
					newrow[0] = padded_block_id

				block_id = newrow[0]

				# Sanitize incomplete rows
				if all(newrow):
					if block_id in block_ids:
						key_collisions += 1
					else:
						block_ids.add(block_id)
						csv_out.writerow(newrow)
						rows_written += 1

				rows += 1
	
	print('%d key collisions found' % (key_collisions,))
	print('%d block_ids padded' % (padded_block_ids))
	print('%d rows processed' % (rows,))
	print('%d rows written' % (rows_written,))

if __name__ == '__main__':
	main() 
	
