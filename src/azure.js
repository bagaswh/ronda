import { DefaultAzureCredential } from "@azure/identity";
import { AuthorizationManagementClient } from "@azure/arm-authorization";
import { ComputeManagementClient } from "@azure/arm-compute";
import { MySQLManagementFlexibleServerClient } from "@azure/arm-mysql-flexible";
import { MonitorClient } from "@azure/arm-monitor";

let tokenCredential = null;

export function isMySQLFlexibleServerStarted(resourceId) {}
export function isMySQLFlexibleServerStopped(resourceId) {}
export function isVMStarted(resourceId) {}
export function isVMDeallocated(resourceId) {}
export function doesVMSSAutoscaleInstanceCountSettingMatch(
  autoscaleSettingSubscriptionId,
  autoscaleSettingResourceGroup,
  autoscaleSettingName
) {}

export function doesResourceStateMatch(expected, resourceId) {}

export function parseResourceId(resourceId) {
  const split = resourceId.split("/");
  const provider = split.slice(6, split.length - 1);
  const namespace = provider.slice(0, provider.length - 1)[0];
  const type = provider.slice(provider.length - 1)[0];
  return {
    resourceId,
    subscriptionId: split[2],
    resourceGroup: split[4],
    provider: {
      namespace,
      type,
      provider: provider.join("/"),
    },
    resourceName: split[split.length - 1],
  };
}

export function humanReadableResourceId(resourceId) {
  const {
    subscriptionId,
    resourceGroup,
    resourceName,
    provider: { namespace, type },
  } = parseResourceId(resourceId);
  return `${subscriptionId.slice(
    0,
    7
  )}***/${resourceGroup}/${resourceName} (namespace=${namespace} type=${type})`;
}

function authenticate() {
  if (tokenCredential === null) {
    tokenCredential = new DefaultAzureCredential();
  }
  return tokenCredential;
}

export async function getSelfRoleAssignments(resourceId) {
  const {
    subscriptionId,
    resourceGroup,
    resourceName,
    provider: { namespace, type },
  } = parseResourceId(resourceId);

  const token = authenticate();
  const client = new AuthorizationManagementClient(token, subscriptionId);
  const roleAssignmentsIterator = client.permissions.listForResource(
    resourceGroup,
    namespace,
    "",
    type,
    resourceName
  );
  const roleAssignments = [];
  for await (const roleAssignment of roleAssignmentsIterator) {
    roleAssignments.push(roleAssignment);
  }
  return roleAssignments;
}

export async function resizeVm(resourceId, size) {
  const { subscriptionId, resourceGroup, resourceName } =
    parseResourceId(resourceId);

  const token = authenticate();
  const client = new ComputeManagementClient(token, subscriptionId);

  const vm = await client.virtualMachines.get(resourceGroup, resourceName);
  vm.hardwareProfile.vmSize = size;
  return client.virtualMachines.beginUpdate(resourceGroup, resourceName, vm);
}

export function startVm(resourceId) {
  const { subscriptionId, resourceGroup, resourceName } =
    parseResourceId(resourceId);

  const token = authenticate();
  const client = new ComputeManagementClient(token, subscriptionId);
  return client.virtualMachines.beginStart(resourceGroup, resourceName);
}

export function deallocateVm(resourceId) {
  const { subscriptionId, resourceGroup, resourceName } =
    parseResourceId(resourceId);

  const token = authenticate();
  const client = new ComputeManagementClient(token, subscriptionId);
  return client.virtualMachines.beginDeallocate(resourceGroup, resourceName);
}

export async function setVmssAutoscaleConfig(
  autoscaleSettingSubscriptionId,
  autoscaleSettingResourceGroup,
  autoscaleSettingName,
  config
) {
  const token = authenticate();
  const client = new MonitorClient(token, autoscaleSettingSubscriptionId);

  const autoscaleSetting = await client.autoscaleSettings.get(
    autoscaleSettingResourceGroup,
    autoscaleSettingName
  );
  const profile = autoscaleSetting.profiles[0];
  autoscaleSetting.profiles[0] = {
    ...profile,
    capacity: {
      minimum: config.min.toString(),
      maximum: config.max.toString(),
      default: config.default.toString(),
    },
  };

  return client.autoscaleSettings.update(
    autoscaleSettingResourceGroup,
    autoscaleSettingName,
    autoscaleSetting
  );
}

export async function getVmssAutoscaleConfig(
  autoscaleSettingSubscriptionId,
  autoscaleSettingResourceGroup,
  autoscaleSettingName
) {
  const token = authenticate();
  const client = new MonitorClient(token, autoscaleSettingSubscriptionId);

  const autoscaleSetting = await client.autoscaleSettings.get(
    autoscaleSettingResourceGroup,
    autoscaleSettingName
  );
  const profile = autoscaleSetting.profiles[0];
  if (profile) {
    return {
      min: profile.capacity.minimum,
      max: profile.capacity.maximum,
      default: profile.capacity.default,
    };
  }
  return null;
}

export function stopMysqlFlexibleServer(resourceId) {
  const { subscriptionId, resourceGroup, resourceName } =
    parseResourceId(resourceId);

  const token = authenticate();
  const client = new MySQLManagementFlexibleServerClient(token, subscriptionId);
  return client.servers.beginStop(resourceGroup, resourceName);
}

export function startMysqlFlexibleServer(resourceId) {
  const { subscriptionId, resourceGroup, resourceName } =
    parseResourceId(resourceId);

  const token = authenticate();
  const client = new MySQLManagementFlexibleServerClient(token, subscriptionId);
  return client.servers.beginStart(resourceGroup, resourceName);
}
