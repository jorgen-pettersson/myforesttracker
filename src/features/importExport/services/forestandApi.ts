import { FORESTAND_IMPORT_URL } from "../../../constants";

export interface ForestandApiResult {
  ok: boolean;
  statusLine: string;
  text: string;
}

export const convertForestandXml = async (
  xmlData: string
): Promise<ForestandApiResult> => {
  const response = await fetch(FORESTAND_IMPORT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      Accept: "application/json",
    },
    body: xmlData,
  });

  const text = await response.text();
  const statusLine = `${response.status} ${response.statusText}`.trim();

  return {
    ok: response.ok,
    statusLine,
    text,
  };
};
