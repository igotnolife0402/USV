#!/usr/bin/env python3
"""Venomreaver: the poison set rebuilt at maximum quality with hq.py (curved shell plates, rolled rims, lathed vials and
lenses, swept hoses and horns, rivets, smooth shading by angle) on the same rig, groups and stages as sets.py poison.
  python venomreaver.py OUT <cuirass|pauldrons|arms|legs|helm>     then: python hq.py OUT (audit), python preview.py OUT x.png
Pieces live in vhq_torso.py (cuirass, pauldrons), vhq_limbs.py (arms, legs), vhq_helm.py (helm); each has build(stage, K)."""
import json, sys
from hq import Kit

MATS = {'plate': dict(material='Metal', color='#4d6b3c', metalness=0.72, roughness=0.3), 'iron': dict(material='CorrodedMetal', color='#6b7466', metalness=0.88, roughness=0.34),
        'deep': dict(material='CorrodedMetal', color='#16240f', metalness=0.3, roughness=0.6), 'bronze': dict(material='Metal', color='#a8b24e', metalness=0.95, roughness=0.3),
        'dark': dict(material='Slate', color='#0c100b', metalness=0.3, roughness=0.7), 'bone': dict(material='Marble', color='#d9d4b2', metalness=0.0, roughness=0.45),
        'glass': dict(material='Glass', color='#9dff5c', metalness=0.05, roughness=0.04, transparency=0.35), 'glow': dict(color='#7dff2a', material='Neon'),
        'leather': dict(material='Fabric', color='#2b2216', metalness=0.0, roughness=0.78)}
MODULE = {'cuirass': 'vhq_torso', 'pauldrons': 'vhq_torso', 'arms': 'vhq_limbs', 'legs': 'vhq_limbs', 'helm': 'vhq_helm'}

if __name__ == '__main__':
    OUT, STAGE = sys.argv[1], sys.argv[2]
    K = Kit(OUT, 'vhq', MATS)
    __import__(MODULE[STAGE]).build(STAGE, K)
    print(json.dumps(K.save(STAGE)))
