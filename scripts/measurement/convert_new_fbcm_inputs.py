#!/bin/python3

def main():
    import pandas as pd
    import argparse

    # Parse input values
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument(
        'csv', type=str, help='input csv file from sMAP Pipeline')
    args = parser.parse_args()

    csv_path = args.csv

    output_aps = csv_path.replace('.csv', '_ap.csv')
    output_polygons = csv_path.replace('.csv', '_polygon.csv')

    df = pd.read_csv(csv_path)
    filtered_df_poly = df[df['Polygon'].notnull()]
    filtered_df_ap = df[df['Polygon'].isnull()]

    filtered_df_ap = filtered_df_ap.drop(['Action Types', 'Polygon'], axis=1)
    filtered_df_poly = filtered_df_poly.drop(
        ['Latitude', 'Longitude', 'Impact Radius', 'Action Types'], axis=1)
    filtered_df_poly = filtered_df_poly.rename(
        columns={'Site ID': 'Region ID'})
    print(filtered_df_poly.iloc[0])
    print(filtered_df_ap.iloc[0])

    # # Break Up Polygons into chunks
    # chunk_size = int(df.shape[0] / 10)
    # chunknum = 0
    # for start in range(0, df.shape[0], chunk_size):
    #     df_subset = filtered_df_poly.iloc[start:start + chunk_size]
    #     df_subset.to_csv(output_polygons.replace(
    #         '_polygon.csv', f'_polygon{chunknum}.csv'), index=False)
    #     chunknum += 1

    filtered_df_poly.to_csv(output_polygons, index=False)
    filtered_df_ap.to_csv(output_aps, index=False)


if __name__ == "__main__":
    # execute only if run as a script
    main()
