#!/usr/bin/env python3
"""Patch the bundled checkout provider's rejection of its already-current branch.

The provider's host entry already handles this branch selection without checkout.
The patch keeps foreign-provider ownership checks and actual branch-switch guards.
It is deliberately tied to known bundle fragments; an unfamiliar release fails
closed rather than rewriting arbitrary code. BB reserves bundled plugin IDs, so
this is a runtime patch, not an independently installable provider fork.
"""
import argparse
from pathlib import Path

MARKER = 'bbCurrentCheckoutBranchFix'
ANCHOR = 'async function E(e){return(await o.sdk.environments.list'
HELPER = '''async function bbCurrentCheckoutBranchFix(e){
  if(e.branch.kind!=="existing")return false;
  try{
    const checkout=await s.call("inspectCheckout",{path:e.path},{hostId:e.hostId});
    return checkout.isGitRepo&&checkout.checkout.kind==="branch"&&checkout.checkout.branchName===e.branch.name;
  }catch{return false;}
}
'''
REPLACEMENTS = [
    (ANCHOR, HELPER + ANCHOR),
    ('if(c!==null&&await g({hostId:r,path:i,threadId:e.thread.id}))',
     'if(c!==null&&!await bbCurrentCheckoutBranchFix({hostId:r,path:i,branch:c})&&await g({hostId:r,path:i,threadId:e.thread.id}))'),
    ('if(n===void 0)return{action:"accept"};if(await g({hostId:e.host.id,path:r,threadId:null}))',
     'if(n===void 0||await bbCurrentCheckoutBranchFix({hostId:e.host.id,path:r,branch:n}))return{action:"accept"};if(await g({hostId:e.host.id,path:r,threadId:null}))'),
]


def patched(source):
    if MARKER in source:
        return source
    for old, new in REPLACEMENTS:
        if source.count(old) != 1:
            raise ValueError('Unsupported checkout provider bundle; inspect this BB release before patching')
        source = source.replace(old, new, 1)
    return source


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('server', type=Path, help='Installed environment-project-checkout/dist/server.js')
    parser.add_argument('--output', required=True, type=Path, help='Write the patched bundle here for review and tests')
    arguments = parser.parse_args()
    arguments.output.write_text(patched(arguments.server.read_text()))
    print(arguments.output)
