# IK reach check: every mac_* pose's hand vs its IK target (<= 0.05 stud). Usage (from this folder): python3 ikcheck.py <scratch with kit/>
import sys, os, runpy; sys.path.insert(0, os.getcwd())
S=sys.argv[1]; sys.argv=['avatar.py', S+'/kit', S+'/probe_out', '--pose', 'mac_ready', '--clip', 'macarena']
g=runpy.run_path('avatar.py', run_name='__main__')
piv, set_pose, POSES, root, V = g['piv'], g['set_pose'], g['POSES'], g['root'], g['Vector']
worst=0
for p in [k for k in POSES if k.startswith('mac_')]:
    set_pose(POSES[p]); M=root.matrix_world.inverted()
    for side,(t,_) in POSES[p]['ik'].items():
        h=M@piv[side+'Hand'].matrix_world.translation; e=(h-V(t)).length; worst=max(worst,e)
        if e>0.05: print('MISS',p,side,round(e,3))
print('worst IK error',round(worst,3))
# feet planted: every key pose's ankles vs their rest spots (x/y), ignoring airborne keys (plant=False)
foot=0
for p in [k for k in POSES if k.startswith('mac_') and 'plant' in POSES[k]]:
    set_pose(POSES[p]); lo=None
    for s in ('Right','Left'):
        a=piv[s+'Foot'].matrix_world.translation; r=g['REST'][s+'Foot']; e=((a.x-r.x)**2+(a.y-r.y)**2)**0.5; foot=max(foot,e)
        if e>0.03: print('SLIDE',p,s,round(e,3))
print('worst foot slide',round(foot,3))
