export interface Contact {
  ID: string;
  NAME: string;
  PHONE?: string;
  EMAIL?: string;
  ADDRESS?: string;
  WEB?: string;
}

export interface BitrixAPIResponse<T> {
  result: T;
  total?: number;
  next?: number;
  time?: {
    start: number;
    finish: number;
    duration: number;
    processing: number;
    date_start: string;
    date_finish: string;
  };
}

export interface BitrixListRequest extends Record<string, unknown> {
  order?: Record<string, 'ASC' | 'DESC'>;
  filter?: Record<string, unknown>;
  select?: string[];
}

