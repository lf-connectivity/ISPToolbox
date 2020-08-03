import mmwave

bb = [-0.3999924659729004,49.15775509179997,-0.39685964584350586,49.15893383781975]
# aoi = mmwave.getAreaOfInterest(bb)
# print(aoi)

bbs = mmwave.splitBB(bb)
print(bb)
print(bbs)