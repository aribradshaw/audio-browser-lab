import { expect, test } from '@playwright/test'

type ExportedReport = {
  integration?: {
    library?: string
    backend?: string
    duration?: number
    currentTime?: number
    events?: Array<{ event: string }>
  }
}

async function exportReport(page: import('@playwright/test').Page): Promise<ExportedReport> {
  await page.getByRole('button', { name: 'Seek to 50%' }).click()
  await page.getByRole('button', { name: 'Export report' }).click()
  await expect(page.locator('#report-output')).toContainText('"integration"')
  return JSON.parse(await page.locator('#report-output').innerText()) as ExportedReport
}

test('Howler example exports backend, duration, position, and lifecycle evidence', async ({ page }) => {
  await page.goto('examples/howler/')
  await expect(page.locator('#example-status')).toHaveText('Ready')
  const report = await exportReport(page)

  expect(report.integration?.library).toBe('howler')
  expect(['webaudio', 'html5']).toContain(report.integration?.backend)
  expect(report.integration?.duration).toBeGreaterThan(7)
  expect(report.integration?.currentTime).toBeGreaterThan(3)
  expect(report.integration?.events?.map(({ event }) => event)).toEqual(expect.arrayContaining(['load', 'seek']))
})

test('WaveSurfer example exports backend, duration, position, and lifecycle evidence', async ({ page }) => {
  await page.goto('examples/wavesurfer/')
  await expect(page.locator('#example-status')).toHaveText('Ready')
  const report = await exportReport(page)

  expect(report.integration?.library).toBe('wavesurfer')
  expect(report.integration?.backend).toBe('media-element')
  expect(report.integration?.duration).toBeGreaterThan(7)
  expect(report.integration?.currentTime).toBeGreaterThan(3)
  expect(report.integration?.events?.map(({ event }) => event)).toEqual(expect.arrayContaining(['load', 'ready']))
})
