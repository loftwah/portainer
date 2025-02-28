import axios, { parseAxiosError } from '@/portainer/services/axios';

import {
  Environment,
  EnvironmentGroupId,
  EnvironmentId,
  EnvironmentType,
  EnvironmentSettings,
  TagId,
  TeamId,
  UserId,
} from '../types';

import { arrayToJson, buildUrl } from './utils';

interface EndpointsQuery {
  search?: string;
  types?: EnvironmentType[];
  tagIds?: TagId[];
  endpointIds?: EnvironmentId[];
  tagsPartialMatch?: boolean;
  groupId?: EnvironmentGroupId;
}

export async function getEndpoints(
  start: number,
  limit: number,
  { types, tagIds, endpointIds, ...query }: EndpointsQuery = {}
) {
  if (tagIds && tagIds.length === 0) {
    return { totalCount: 0, value: <Environment[]>[] };
  }

  const url = buildUrl();

  const params: Record<string, unknown> = { start, limit, ...query };

  if (types) {
    params.types = arrayToJson(types);
  }

  if (tagIds) {
    params.tagIds = arrayToJson(tagIds);
  }

  if (endpointIds) {
    params.endpointIds = arrayToJson(endpointIds);
  }

  try {
    const response = await axios.get<Environment[]>(url, { params });

    const totalCount = response.headers['X-Total-Count'];

    return { totalCount: parseInt(totalCount, 10), value: response.data };
  } catch (e) {
    throw parseAxiosError(e as Error);
  }
}

export async function getEndpoint(id: EnvironmentId) {
  try {
    const { data: endpoint } = await axios.get<Environment>(buildUrl(id));
    return endpoint;
  } catch (e) {
    throw parseAxiosError(e as Error);
  }
}

export async function snapshotEndpoints() {
  try {
    await axios.post<void>(buildUrl(undefined, 'snapshot'));
  } catch (e) {
    throw parseAxiosError(e as Error);
  }
}

export async function snapshotEndpoint(id: EnvironmentId) {
  try {
    await axios.post<void>(buildUrl(id, 'snapshot'));
  } catch (e) {
    throw parseAxiosError(e as Error);
  }
}

export async function endpointsByGroup(
  start: number,
  limit: number,
  search: string,
  groupId: EnvironmentGroupId
) {
  return getEndpoints(start, limit, { search, groupId });
}

export async function disassociateEndpoint(id: EnvironmentId) {
  try {
    await axios.delete(buildUrl(id, 'association'));
  } catch (e) {
    throw parseAxiosError(e as Error);
  }
}

interface UpdatePayload {
  TLSCACert?: File;
  TLSCert?: File;
  TLSKey?: File;

  Name: string;
  PublicURL: string;
  GroupID: EnvironmentGroupId;
  TagIds: TagId[];

  EdgeCheckinInterval: number;

  TLS: boolean;
  TLSSkipVerify: boolean;
  TLSSkipClientVerify: boolean;
  AzureApplicationID: string;
  AzureTenantID: string;
  AzureAuthenticationKey: string;
}

async function uploadTLSFilesForEndpoint(
  id: EnvironmentId,
  tlscaCert?: File,
  tlsCert?: File,
  tlsKey?: File
) {
  await Promise.all([
    uploadCert('ca', tlscaCert),
    uploadCert('cert', tlsCert),
    uploadCert('key', tlsKey),
  ]);

  function uploadCert(type: 'ca' | 'cert' | 'key', cert?: File) {
    if (!cert) {
      return null;
    }
    try {
      return axios.post<void>(`upload/tls/${type}`, cert, {
        params: { folder: id },
      });
    } catch (e) {
      throw parseAxiosError(e as Error);
    }
  }
}

export async function updateEndpoint(
  id: EnvironmentId,
  payload: UpdatePayload
) {
  try {
    await uploadTLSFilesForEndpoint(
      id,
      payload.TLSCACert,
      payload.TLSCert,
      payload.TLSKey
    );

    const { data: endpoint } = await axios.put<Environment>(
      buildUrl(id),
      payload
    );

    return endpoint;
  } catch (e) {
    throw parseAxiosError(e as Error, 'Unable to update environment');
  }
}

export async function deleteEndpoint(id: EnvironmentId) {
  try {
    await axios.delete(buildUrl(id));
  } catch (e) {
    throw parseAxiosError(e as Error);
  }
}

export async function updatePoolAccess(
  id: EnvironmentId,
  resourcePool: string,
  usersToAdd: UserId[],
  teamsToAdd: TeamId[],
  usersToRemove: UserId[],
  teamsToRemove: TeamId[]
) {
  try {
    await axios.put<void>(`${buildUrl(id, 'pools')}/${resourcePool}/access`, {
      usersToAdd,
      teamsToAdd,
      usersToRemove,
      teamsToRemove,
    });
  } catch (e) {
    throw parseAxiosError(e as Error);
  }
}

export async function forceUpdateService(
  id: EnvironmentId,
  serviceID: string,
  pullImage: boolean
) {
  try {
    await axios.put(buildUrl(id, 'forceupdateservice'), {
      serviceID,
      pullImage,
    });
  } catch (e) {
    throw parseAxiosError(e as Error);
  }
}

export async function updateSettings(
  id: EnvironmentId,
  settings: EnvironmentSettings
) {
  try {
    await axios.put(buildUrl(id, 'settings'), settings);
  } catch (e) {
    throw parseAxiosError(e as Error);
  }
}
