import { Module } from '@nestjs/common'

import { loadEnv } from '../env.js'
import { ALARM_SOURCE } from './alarm-source.js'
import { AlarmController } from './alarm.controller.js'
import { AlarmService } from './alarm.service.js'
import { AlarmEventsController } from './events.controller.js'
import { AlarmEventsService } from './events.service.js'
import { AlarmHistoryController } from './history.controller.js'
import { AlarmHistoryService } from './history.service.js'
import { MockAlarmSource } from './mock.source.js'
import { UkraineAlarmSource } from './ukrainealarm.source.js'

@Module({
  controllers: [AlarmController, AlarmHistoryController, AlarmEventsController],
  providers: [
    AlarmService,
    AlarmEventsService,
    AlarmHistoryService,
    UkraineAlarmSource,
    MockAlarmSource,
    {
      provide: ALARM_SOURCE,
      inject: [UkraineAlarmSource, MockAlarmSource],
      useFactory: (real: UkraineAlarmSource, mock: MockAlarmSource) => {
        const env = loadEnv()
        return env.ALARM_MOCK && env.NODE_ENV !== 'production' ? mock : real
      }
    }
  ],
  exports: [AlarmService]
})
export class AlarmModule {}
