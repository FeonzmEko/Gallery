import { describe, it, expect } from 'vitest';
import { router } from '../src/app/router';

describe('Router Configuration (@archive/web/src/app/router)', () => {
  it('defines the required core routes', () => {
    const routes = router.getRoutes();
    const routePaths = routes.map((r) => r.path);

    expect(routePaths).toContain('/');
    expect(routePaths).toContain('/timeline');
    expect(routePaths).toContain('/media');
    expect(routePaths).toContain('/journal');
    expect(routePaths).toContain('/travel');
  });

  it('redirects /timeline to /', async () => {
    await router.push('/timeline');
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('navigates to /media', async () => {
    await router.push('/media');
    expect(router.currentRoute.value.path).toBe('/media');
    expect(router.currentRoute.value.meta.title).toContain('媒体长廊');
  });

  it('navigates to /journal', async () => {
    await router.push('/journal');
    expect(router.currentRoute.value.path).toBe('/journal');
    expect(router.currentRoute.value.meta.title).toContain('随想日记');
  });

  it('navigates to /travel', async () => {
    await router.push('/travel');
    expect(router.currentRoute.value.path).toBe('/travel');
    expect(router.currentRoute.value.meta.title).toContain('足迹漫游');
  });

  it('matches 404 for unknown routes', async () => {
    await router.push('/some-unknown-path-1234');
    expect(router.currentRoute.value.name).toBe('not-found');
  });
});
