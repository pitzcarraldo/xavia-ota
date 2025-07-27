// @ts-expect-error
import formidable from 'formidable-mini';
import moment from 'moment';
import { NextApiRequest, NextApiResponse } from 'next';

import { DatabaseFactory } from '../../apiUtils/database/DatabaseFactory';
import { StorageFactory } from '../../apiUtils/storage/StorageFactory';

import { HashHelper } from '../../apiUtils/helpers/HashHelper';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function uploadHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const form = formidable();

  try {
    const parsed = await form.parse(req);
    const file = Array.from(parsed.files)?.[0] as any;
    const fields = Object.fromEntries([...parsed.fields].map(({ name, value }) => [name, value]));
    const runtimeVersion = fields.runtimeVersion;
    const commitHash = fields.commitHash;
    const commitMessage = fields.commitMessage || 'No message provided';

    if (!file || !runtimeVersion || !commitHash) {
      res.status(400).json({ error: 'Missing file, runtime version, or commit hash' });
      return;
    }

    const storage = StorageFactory.getStorage();
    const timestamp = moment().utc().format('YYYYMMDDHHmmss');
    const updatePath = `updates/${runtimeVersion}`;

    const zipContent = Buffer.from(file.contents);

    const updateHash = HashHelper.createHash(zipContent, 'sha256', 'hex');
    const updateId = HashHelper.convertSHA256HashToUUID(updateHash);

    const path = await storage.uploadFile(`${updatePath}/${timestamp}.zip`, zipContent);

    await DatabaseFactory.getDatabase().createRelease({
      path,
      runtimeVersion,
      timestamp: moment().utc().toString(),
      commitHash,
      commitMessage,
      updateId,
    });

    res.status(200).json({ success: true, path });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}
