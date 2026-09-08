import pandas as pd
import glob

files = glob.glob('public/data/geoparquet/wrf/**/season=*.parquet', recursive=True)
for f in files:
    try:
        print(f"Fixing {f}...")
        df = pd.read_parquet(f, engine='fastparquet')
        
        cols_to_drop = [c for c in ['profile_means', 'wpd_profile_means', 'profile_heights'] if c in df.columns]
        if cols_to_drop:
            print(f"Dropping {cols_to_drop}")
            df = df.drop(columns=cols_to_drop)
            
        df.to_parquet(f, engine='fastparquet', index=False)
        print(f"Fixed {f} successfully.")
    except Exception as e:
        print(f"Error on {f}: {e}")
