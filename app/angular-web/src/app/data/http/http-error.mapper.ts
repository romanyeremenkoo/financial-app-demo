import { HttpErrorResponse } from '@angular/common/http';
import { isTransferErrorCode } from '../../domain/models/transfer.model';
import { DataSourceError, TransferRejectedError } from '../repositories/banking-data-source';
import { ErrorDto } from './dto';

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_UNPROCESSABLE = 422;
/** Angular reports transport-level failures (DNS, refused, CORS) as status 0. */
const HTTP_TRANSPORT_FAILURE = 0;

const isErrorDto = (value: unknown): value is ErrorDto =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ErrorDto).code === 'string' &&
  typeof (value as ErrorDto).message === 'string';

/**
 * Translates a transport or server failure into a stable domain error.
 *
 * Business rejections keep their contract error codes so the UI renders the
 * same translated message it shows in demo mode. A connection failure becomes
 * `unavailable`; the application surfaces it with a retry and never silently
 * falls back to demo data, which would make a failed write look successful.
 */
export const toDataSourceError = (error: HttpErrorResponse, baseUrl: string): DataSourceError => {
  if (error.status === HTTP_TRANSPORT_FAILURE) {
    return new DataSourceError(
      'unavailable',
      'API_UNAVAILABLE',
      `Could not reach the banking API at ${baseUrl}.`,
    );
  }

  const body: unknown = error.error;
  if (!isErrorDto(body)) {
    return new DataSourceError(
      'unknown',
      'INTERNAL_ERROR',
      `Request failed with ${String(error.status)}.`,
    );
  }

  if (error.status === HTTP_UNPROCESSABLE && isTransferErrorCode(body.code)) {
    return new TransferRejectedError([body.code]);
  }

  if (error.status === HTTP_BAD_REQUEST) {
    const codes = (body.details ?? []).map((detail) => detail.code).filter(isTransferErrorCode);
    return codes.length > 0
      ? new TransferRejectedError(codes)
      : new DataSourceError('rejected', body.code, body.message);
  }

  if (error.status === HTTP_NOT_FOUND) {
    return new DataSourceError('not-found', body.code, body.message);
  }

  if (error.status === HTTP_CONFLICT) {
    return new DataSourceError('conflict', body.code, body.message);
  }

  return new DataSourceError('unknown', body.code, body.message);
};
