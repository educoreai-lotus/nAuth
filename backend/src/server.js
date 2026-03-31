import app from './app.js'
import { config } from './config/env.js'
import { autoRegisterOnStartup } from './services/coordinator/registrationService.js'

async function bootstrap() {
  await autoRegisterOnStartup()

  app.listen(config.port, () => {
    console.log(`nAuth backend running on ${config.backendBaseUrl}`)
  })
}

bootstrap()
