import { Injectable } from '@nestjs/common'
import type { UpstreamRegionAlerts, UpstreamRegionNode } from '@carplates/shared'

import type { AlarmSource } from './alarm-source.js'

const node = (
  regionId: string,
  regionName: string,
  regionType: string,
  regionChildIds: UpstreamRegionNode[] = []
): UpstreamRegionNode => ({ regionId, regionName, regionType, regionChildIds })

/** Dev only (`ALARM_MOCK=true`): a fixed fake tree and alert list in the upstream shape. */
@Injectable()
export class MockAlarmSource implements AlarmSource {
  readonly enabled = true

  fetchRegions(): Promise<UpstreamRegionNode[]> {
    return Promise.resolve([
      node('22', 'Харківська область', 'State', [node('126', 'Богодухівський район', 'District')]),
      node('20', 'Сумська область', 'State'),
      node('31', 'м. Київ', 'State')
    ])
  }

  fetchAlerts(): Promise<UpstreamRegionAlerts[]> {
    const now = new Date().toISOString()
    const entry = (
      regionId: string,
      regionName: string,
      regionType: string,
      types: string[],
      alertLevel = 'Red'
    ): UpstreamRegionAlerts => ({
      regionId,
      regionType,
      regionName,
      lastUpdate: now,
      activeAlerts: types.map(type => ({ type, regionType, lastUpdate: now, activeAlertLevels: [{ alertLevel }] }))
    })
    return Promise.resolve([
      entry('126', 'Богодухівський район', 'District', ['AIR']),
      entry('20', 'Сумська область', 'State', ['AIR', 'ARTILLERY']),
      entry('31', 'м. Київ', 'State', ['AIR'], 'Yellow')
    ])
  }
}
