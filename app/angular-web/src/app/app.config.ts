import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { TitleStrategy } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialogConfig } from '@angular/material/dialog';
import { provideEchartsCore } from 'ngx-echarts';
import { provideTranslateService } from '@ngx-translate/core';
import { routes } from './app.routes';
import { provideBankingDataSource } from './data/repositories/banking-data-source.provider';
import { DEFAULT_LANGUAGE } from './core/i18n/language';
import { readStoredLanguage } from './core/i18n/language.storage';
import { StaticTranslateLoader } from './core/i18n/static-translate.loader';
import { TranslatedTitleStrategy } from './core/i18n/translated-title.strategy';

const DIALOG_WIDTH = '440px';
const DIALOG_MAX_WIDTH = '92vw';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch()),
    // Demo adapter or shared Spring Boot API, decided once from the environment.
    provideBankingDataSource(),
    provideTranslateService({
      lang: readStoredLanguage(),
      fallbackLang: DEFAULT_LANGUAGE,
      loader: StaticTranslateLoader,
    }),
    provideEchartsCore({
      echarts: () => import('./core/charts/echarts-core').then((m) => m.echartsCore),
    }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
    {
      // Spread the stock config first: Material skips its own defaults (including
      // role="dialog") whenever this token is provided.
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useFactory: () => ({
        ...new MatDialogConfig(),
        autoFocus: 'dialog',
        restoreFocus: true,
        width: DIALOG_WIDTH,
        maxWidth: DIALOG_MAX_WIDTH,
      }),
    },
  ],
};
