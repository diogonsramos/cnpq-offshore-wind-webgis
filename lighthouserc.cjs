module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      numberOfRuns: 3
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.2 }],
        'categories:accessibility': ['warn', { minScore: 0.8 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
