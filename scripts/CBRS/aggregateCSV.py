import csv


class CBRSCountyStats:
    def __init__(self, countyName, countyCode, stateCode, price, companyName):
        self.cn = countyName
        self.cc = countyCode
        self.sc = stateCode
        self.price = price
        self.companies = dict()
        self.companies[companyName] = 1

    def add(self, companyName, price):
        if price != self.price:
            raise Exception("Price not the same yikes")
        if companyName in self.companies:
            self.companies[companyName] += 1
        else:
            self.companies[companyName] = 1

    def companyCount(self):
        return len(self.companies)

    def sanityPrint(self):
        print("County name: {}, County code: {}, State code: {}, Price: {}".format(
            self.cn,
            self.cc,
            self.sc,
            self.price,
        ))
        print("Companies: ")
        for key in self.companies:
            print("Company: " + key)
            print("Licenses: " + str(self.companies[key]))


with open('results_by_license.csv', newline='') as csvFile:
    reader = csv.reader(csvFile, delimiter=',')
    # Skip header
    next(reader)
    counties = dict()
    # Aggregate data by county
    for row in reader:
        county = row[2]
        countySplit = county.split('-')
        stateCode = countySplit[0]
        countyCode = countySplit[1]
        countyName = row[3]
        companyName = row[4]
        price = row[-3]
        if county in counties:
            counties[county].add(companyName, price)
        else:
            counties[county] = CBRSCountyStats(countyName, countyCode, stateCode, price, companyName)
    i = 0
    maxCompanies = 0
    for key in counties:
        maxCompanies = max(maxCompanies, counties[key].companyCount())
        counties[key].sanityPrint()
    print(maxCompanies)
    with open('county_aggregated_results.csv', mode='w', newline='') as writeFile:
        # Write data aggregated by county
        writer = csv.writer(writeFile, delimiter=',', quotechar='"')
        for key in counties:
            agg = counties[key]
            countyCode = agg.cc
            stateCode = agg.sc
            countyName = agg.cn
            price = agg.price
            companyDict = agg.companies
            companies = []
            licenseCounts = []
            for k in companyDict:
                companies.append(k)
                licenseCounts.append(str(companyDict[k]))
            companies = '|'.join(companies)
            licenseCounts = '|'.join(licenseCounts)
            writer.writerow([stateCode, countyCode, countyName, price, companies, licenseCounts])
