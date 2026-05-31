#!/usr/bin/env python3
import os
import sys
from supabase import create_client, Client

def test_connection():
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not key:
        print("❌ FAIL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        return False
    
    try:
        supabase: Client = create_client(url, key)
        print("✅ PASS: Supabase client created")
        return True
    except Exception as e:
        print(f"❌ FAIL: Could not create Supabase client: {e}")
        return False

def test_claim_rpc(supabase: Client):
    try:
        result = supabase.rpc('claim_stealthy_crawl_job').execute()
        print(f"✅ PASS: claim_stealthy_crawl_job RPC callable (returned {len(result.data or [])} jobs)")
        return True
    except Exception as e:
        print(f"❌ FAIL: claim_stealthy_crawl_job RPC error: {e}")
        return False

def test_get_unprocessed_rpc(supabase: Client):
    try:
        result = supabase.rpc('get_unprocessed_stealthy_crawls', {'limit_count': 5}).execute()
        print(f"✅ PASS: get_unprocessed_stealthy_crawls RPC callable (returned {len(result.data or [])} jobs)")
        return True
    except Exception as e:
        print(f"❌ FAIL: get_unprocessed_stealthy_crawls RPC error: {e}")
        return False

def main():
    print("Supabase Smoke Test")
    print("=" * 60)
    
    if not test_connection():
        sys.exit(1)
    
    url = os.environ['SUPABASE_URL']
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    supabase = create_client(url, key)
    
    tests = [
        test_claim_rpc(supabase),
        test_get_unprocessed_rpc(supabase),
    ]
    
    print("=" * 60)
    if all(tests):
        print("✅ ALL TESTS PASSED")
        sys.exit(0)
    else:
        print("❌ SOME TESTS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
