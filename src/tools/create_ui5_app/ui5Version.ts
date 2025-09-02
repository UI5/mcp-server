import {Ui5Framework} from "../../utils/ui5Framework.js";
import getVersionInfo from "../get_version_info/getVersionInfo.js";

export async function getLatestUi5Version(framework: Ui5Framework): Promise<string> {
	const versions = await getVersionInfo({frameworkName: framework});
	return versions.versions.latest.version;
}
