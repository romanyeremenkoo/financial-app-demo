import { isTransferErrorCode } from '../../domain/models/transfer.model';
import { DataSourceError, TransferRejectedError } from '../repositories/banking-data-source';
import type { ErrorDto } from './dto';

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_UNPROCESSABLE = 422;

export interface HttpRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PATCH';
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
}

export interface HttpResponse<T> {
  readonly status: number;
  readonly data: T;
  readonly headers: Headers;
}

const isErrorDto = (value: unknown): value is ErrorDto =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ErrorDto).code === 'string' &&
  typeof (value as ErrorDto).message === 'string';

const readBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null;
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
};

/**
 * Translates a transport or server failure into a stable domain error.
 *
 * Business rejections keep their contract error codes so the UI renders the
 * same translated message it shows in demo mode.
 */
const toDomainError = (status: number, body: unknown): DataSourceError => {
  if (!isErrorDto(body)) {
    return new DataSourceError('unknown', 'INTERNAL_ERROR', `Request failed with ${status}.`);
  }

  if (status === HTTP_UNPROCESSABLE && isTransferErrorCode(body.code)) {
    return new TransferRejectedError([body.code]);
  }

  if (status === HTTP_BAD_REQUEST) {
    const codes = (body.details ?? []).map((detail) => detail.code).filter(isTransferErrorCode);
    if (codes.length > 0) {
      return new TransferRejectedError(codes);
    }
    return new DataSourceError('rejected', body.code, body.message);
  }

  if (status === HTTP_NOT_FOUND) {
    return new DataSourceError('not-found', body.code, body.message);
  }

  if (status === HTTP_CONFLICT) {
    return new DataSourceError('conflict', body.code, body.message);
  }

  return new DataSourceError('unknown', body.code, body.message);
};

/**
 * Minimal `fetch` wrapper.
 *
 * A network-level failure becomes an `unavailable` error. The application
 * surfaces it as a connection problem with a retry — it never falls back to
 * demo data, because that would make a failed server write look successful.
 */
export class HttpClient {
  constructor(private readonly baseUrl: string) {}

  async request<T>(path: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    const { method = 'GET', body, headers = {}, signal } = options;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        signal,
        headers: {
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (cause) {
      throw new DataSourceError(
        'unavailable',
        'API_UNAVAILABLE',
        `Could not reach the banking API at ${this.baseUrl}: ${String(cause)}`,
      );
    }

    const payload = await readBody(response);

    if (!response.ok) {
      throw toDomainError(response.status, payload);
    }

    return { status: response.status, data: payload as T, headers: response.headers };
  }
}
