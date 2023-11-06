# (c) Meta Platforms, Inc. and affiliates. Copyright
#!/usr/bin/env python3
# (c) Facebook, Inc. and its affiliates. Confidential and proprietary.

import csv
import datetime as dt
import math

# import time [Will use in future versions when functions are checked in]
from typing import List, Tuple

import numpy as np


class Battery:
    """Grouping of attributes for a Battery library component entry.  This
       is a single battery, at the most atomic level available to the user.

    Public Attributes:
    lib_id: Integer.  Unique identifier for this component within the library
    man_name: String. Component Manufacturer Name
    man_number: String. Manufacturer Part Number
    nom_volt: Float. Nominal Battery Voltage (V)
    nom_cap: Float. Nominal Battery Capacity (Ahr)
    max_doc: Float. Maximum Depth of Discharge (0-100% of nom_cap)
    cost: Float. Per unit cost of component
    cycle_life:	Float. Expected component life (# of complete DOC Cycles)
    """

    __slots__ = [
        "lib_id",
        "man_name",
        "man_number",
        "nom_volt",
        "nom_cap",
        "max_doc",
        "cost",
        "cycle_life",
    ]

    def __init__(
        self,
        id: int,
        man: str,
        mpn: str,
        volt: float,
        cap: float,
        doc: float,
        cost: float,
        life: float,
    ) -> None:

        self.lib_id = id
        self.man_name = man
        self.man_number = mpn
        self.nom_volt = volt
        self.nom_cap = cap
        self.max_doc = doc
        self.cost = cost
        self.cycle_life = life


class SolarPanel:
    """Grouping of attributes for a Solar Panel library component entry.  This
       is a single solar panel, at the most atomic level available to the user.

    Public Attributes:
    lib_id: Integer.  Unique identifier for this component within the library
    man_name: String. Component Manufacturer Name
    man_number: String. Manufacturer Part Number
    ocv: Float. Panel maximum open circuit voltage (V)
    scc: Float. Panel maximum short circuit current (A)
    power_stc: Float. Panel maximum power output under STC conditions (W)
    power_notc: Float. Panel maximum power output under NOTC conditions (W)
    cost: Float. Per unit cost of component
    life: Float. Expected component life (years)
    """

    __slots__ = [
        "lib_id",
        "man_name",
        "man_number",
        "ocv",
        "scc",
        "power_stc",
        "power_notc",
        "cost",
        "life",
    ]

    def __init__(
        self,
        id: int,
        man: str,
        mpn: str,
        ocv: float,
        scc: float,
        p_stc: float,
        p_notc: float,
        cost: float,
        life: float,
    ) -> None:
        self.lib_id = id
        self.man_name = man
        self.man_number = mpn
        self.ocv = ocv
        self.scc = scc
        self.power_stc = p_stc
        self.power_notc = p_notc
        self.cost = cost
        self.life = life


class SolarController:
    """Grouping of attributes for an individual Solar Controller library
       component entry.

    Public Attributes:
    lib_id: Integer.  Unique identifier for this component within the library
    man_name: String. Component Manufacturer Name
    man_number: String. Manufacturer Part Number
    batt_volts: List of floats. List of compatible battery system nominal voltages (V)
    max_powers: List of floats. List of maximum operating power (W) for each
        battery system voltage in batt_volts (Position in list must align with
        position in battery voltage list)
    max_ocv: Float. Maximum allowable solar panel open circuit voltage (V)
    max_batt_curr: Float. Maximum battery current output (A)
    cost: Float. Per unit cost of component
    life: Float. Expected component life (years)
    """

    __slots__ = [
        "lib_id",
        "man_name",
        "man_number",
        "batt_volts",
        "max_powers",
        "max_ocv",
        "max_batt_curr",
        "cost",
        "life",
    ]

    def __init__(
        self,
        id: int,
        man: str,
        mpn: str,
        batt_V: List[float],
        max_power: List[float],
        max_ocv: float,
        batt_A: float,
        cost: float,
        life: float,
    ) -> None:
        self.lib_id = id
        self.man_name = man
        self.man_number = mpn
        self.batt_volts = batt_V
        self.max_powers = max_power
        self.max_ocv = max_ocv
        self.max_batt_curr = batt_A
        self.cost = cost
        self.life = life


class Site:
    """Grouping of attributes defining deployment site requirements

    Public Attributes:
        target_availability: Float. Minimum  allowable power system availablilty.
            (0-100% of time power system can provide continuous_power)
        continuous_power: Float. Average power consumption of electrical load (W)
        batt_discharge_eff: Float. Battery discharging efficiency to use in
            simulation (0-100%)
        batt_charge_eff: Float. Battery charging efficiency to use in
            simulation (0-100%)
        solar_cont_eff: Float. Solar controller tracking and converseion efficiency
            to use in the simulation (0-100%)
        target_capacity: Float. Maximum battery energy capacity used in sizing
            system configurations.  (interal use only) (Whr)

        # Cost Inputs
        num_maint_visit: Float. Number of site maintanence visits per year
        cost_maint_visit: Float. cost of each site maintanence visit
        misc_cost: Float. Fixed costs of other power system equipment and
            installation costs per site
        lifetime: Float. The number of years used to calculate the lifetime
            system cost.

        # Site Location
        lat_deg: Float. Latitude of site location (decimal degrees)
        long_deg: Float. Longitude of site location (decimal degrees)

        # Solar Panel Orientation
        panel_slope: Float. Pitch angle of the solar panel mounting
        panel_azimuth: Float. Yaw angle of the solar panel mounting
    """

    __slots__ = [
        "target_availability",
        "continuous_power",
        "batt_discharge_eff",
        "batt_charge_eff",
        "solar_cont_eff",
        "target_capacity",
        "num_maint_visit",
        "cost_maint_visit",
        "misc_cost",
        "lifetime",
        "lat_deg",
        "long_deg",
        "panel_slope",
        "panel_azimuth",
    ]

    def __init__(
        self,
        avail: float,
        power: float,
        dis_eff: float,
        chrg_eff: float,
        solar_eff: float,
        num_maint_visits: float,
        cost_site_visit: float,
        cost_misc: float,
        lifetime: float,
        lat: float,
        long: float,
    ) -> None:
        self.target_availability = avail / 100
        self.continuous_power = power
        self.batt_discharge_eff = dis_eff / 100
        self.batt_charge_eff = chrg_eff / 100
        self.solar_cont_eff = solar_eff / 100
        # Target capacity set to two days backup nominally
        self.target_capacity = self.continuous_power * 24 * 2

        # Cost inputs
        self.num_maint_visit = num_maint_visits
        self.cost_maint_visit = cost_site_visit
        self.misc_cost = cost_misc
        self.lifetime = lifetime

        # Site Location
        self.lat_deg = lat
        self.long_deg = long

        self.panel_slope = 0
        self.panel_azimuth = 0


class SolarArray:
    """Grouping of attributes defining a battery pack, which is a
       series/parallel combination of individual SolarPanel(s)

    Public Attributes:
        solar_id: Integer. lib_id of the solar panel used in this configuration
        solar_ser_qty: Integer. Number of solar panels in series
        solar_par_qty: Integer. Number of solar panels in parallel
        solar_v: Float. Maximum OCV (V) of the configuration (SQty X panel OCV)
        solar_p: Float. Configuration power under STC (W)
        solar_nop: Float. Configuration power under NOTC conditions (W)
    """

    __slots__ = [
        "solar_id",
        "solar_ser_qty",
        "solar_par_qty",
        "solar_v",
        "solar_p",
        "solar_nop",
    ]

    def __init__(
        self,
        solar_id: int,
        solar_ser_qty: int,
        solar_par_qty: int,
        solar_v: float,
        solar_p: float,
        solar_nop: float,
    ) -> None:
        self.solar_id = solar_id
        self.solar_ser_qty = solar_ser_qty
        self.solar_par_qty = solar_par_qty
        self.solar_v = solar_v
        self.solar_p = solar_p
        self.solar_nop = solar_nop

    def __eq__(self, obj: "SolarArray") -> bool:
        return (
            (self.solar_id == obj.solar_id)
            and (self.solar_ser_qty == obj.solar_ser_qty)
            and (self.solar_par_qty == obj.solar_par_qty)
            and (self.solar_v == obj.solar_v)
            and (self.solar_p == obj.solar_p)
            and (self.solar_nop == obj.solar_nop)
        )


class BatteryPack:
    """Grouping of attributes defining a battery pack, which is a series/parallel
       combination of individual Battery(s)

    Public Attributes:
        batt_id: Integer. lib_id of the battery used in this configuration
        batt_ser_qty: Integer. Number of batteries in series
        batt_par_qty: Integer. Number of batteries in parallel
        batt_v: Float. Nominal terminal voltage of the configuration (V)
        batt_cap: Float. Nominal energy capacity of the configuration (Whr)
    """

    __slots__ = ["batt_id", "batt_ser_qty", "batt_par_qty", "batt_v", "batt_cap"]

    def __init__(
        self,
        batt_id: int,
        batt_ser_qty: int,
        batt_par_qty: int,
        batt_v: float,
        batt_cap: float,
    ) -> None:
        self.batt_id = batt_id
        self.batt_ser_qty = batt_ser_qty
        self.batt_par_qty = batt_par_qty
        self.batt_v = batt_v
        self.batt_cap = batt_cap

    def __eq__(self, obj: "BatteryPack") -> bool:
        return (
            (self.batt_id == obj.batt_id)
            and (self.batt_ser_qty == obj.batt_ser_qty)
            and (self.batt_par_qty == obj.batt_par_qty)
            and (self.batt_v == obj.batt_v)
            and (self.batt_cap == obj.batt_cap)
        )


class SolarSystem:
    """Grouping of attributes defining a complete power system configuration for
       the site.  A system includes a series/parallel combination of batteries,
       a series/parallel combination of solar panels and a solar controller.

    Public Attributes:
        solar_cont_id: Integer. lib_id of the battery used in this configuration
        batt_id: Integer. lib_id of the battery used in this configuration
        batt_ser_qty: Integer. Number of batteries in series
        batt_par_qty: Integer. Number of batteries in parallel
        batt_v: Float. Nominal terminal voltage of the configuration (V)
        batt_cap: Float. Nominal energy capacity of the configuration (Whr)
        solar_id: Integer. lib_id of the solar panel used in this configuration
        solar_ser_qty: Integer. Number of solar panels in series
        solar_par_qty: Integer. Number of solar panels in parallel
        solar_v: Float. Maximum OCV (V) of the configuration (SQty X panel OCV)
        solar_p: Float. Configuration power under STC (W)
        solar_nop: Float. Configuration power under NOTC conditions (W)
        avail: Float. Historical power system availability achieved at the
            site (0.0-1.0 %)
        batt_e: Float. Total energy removed from the battery system over the
            simulatiom (Whr)
    """

    __slots__ = [
        "solar_cont_id",
        "batt_id",
        "batt_ser_qty",
        "batt_par_qty",
        "batt_v",
        "batt_cap",
        "solar_id",
        "solar_ser_qty",
        "solar_par_qty",
        "solar_v",
        "solar_p",
        "solar_nop",
        "avail",
        "batt_e",
    ]

    def __init__(
        self,
        solar_cont_id: int,
        batt_id: int,
        batt_ser_qty: int,
        batt_par_qty: int,
        batt_v: float,
        batt_cap: float,
        solar_id: int,
        solar_ser_qty: int,
        solar_par_qty: int,
        solar_v: float,
        solar_p: float,
        solar_nop: float,
    ) -> None:
        self.solar_cont_id = solar_cont_id
        self.batt_id = batt_id
        self.batt_ser_qty = batt_ser_qty
        self.batt_par_qty = batt_par_qty
        self.batt_v = batt_v
        self.batt_cap = batt_cap
        self.solar_id = solar_id
        self.solar_ser_qty = solar_ser_qty
        self.solar_par_qty = solar_par_qty
        self.solar_v = solar_v
        self.solar_p = solar_p
        self.solar_nop = solar_nop
        self.avail = 0
        self.batt_e = 0

    def __eq__(self, obj: "SolarSystem") -> bool:
        return (
            (self.solar_cont_id == obj.solar_cont_id)
            and (self.batt_id == obj.batt_id)
            and (self.batt_ser_qty == obj.batt_ser_qty)
            and (self.batt_par_qty == obj.batt_par_qty)
            and (self.batt_v == obj.batt_v)
            and (self.batt_cap == obj.batt_cap)
            and (self.solar_id == obj.solar_id)
            and (self.solar_ser_qty == obj.solar_ser_qty)
            and (self.solar_par_qty == obj.solar_par_qty)
            and (self.solar_v == obj.solar_v)
            and (self.solar_p == obj.solar_p)
            and (self.solar_nop == obj.solar_nop)
        )


def get_site_solar_systems(
    solar_lib: List[SolarPanel],
    battery_lib: List[Battery],
    controller_lib: List[SolarController],
    target_capacity: float,
) -> List[SolarSystem]:
    """This function takes a series of component libraries and returns all of
    the valid power systems that can be constructed from those library components.

    For each controller, the function independently determines all of the
    possible solar arrays and battery packs that can be configured with the
    library components based on the controller limits.  These are combined to
    create unique combinations of solar arrays and battery packs.
    Having created all possible systems independently, the funtion then removes
    combinations that are not compatible as a system and returns this list of
    valid system configurations.

    Args:
        solar_lib: List[SolarPanel]. SolarPanel component library.
        battery_lib: List[Battery]. Battery component library.
        controller_lib: List[SolarController]. SolarController component library.
        target_capacity: Float. Battery energy capcity target limits upper
            bound of battery pack capacity.

    Returns:
        List[SolarSystem]. The function returns a list of SolarSystems that can
            built from the library components probided, up to the power limits
            of the controllers and provided battery capacity target.
    """

    all_systems = []
    for this_cont in controller_lib:
        # Find all the solar array configurations for this controller
        array_combos = []
        for this_solar in solar_lib:
            solar_ser_qty = math.floor(this_cont.max_ocv / this_solar.ocv)
            for x in range(solar_ser_qty):
                array_combos.extend(
                    get_solar_arrays(this_solar, x + 1, max(this_cont.max_powers))
                )

        # Find all the battery pack configurations for this controller
        cont_batt_voltages = this_cont.batt_volts
        cont_batt_voltages.sort()
        pack_combos = []
        for this_lib_batt in battery_lib:
            batt_voltage = this_lib_batt.nom_volt
            for this_cont_batt in cont_batt_voltages:
                if (this_cont_batt % batt_voltage) == 0:
                    pack_combos.extend(
                        get_battery_packs(
                            this_lib_batt,
                            int(this_cont_batt / batt_voltage),
                            target_capacity,
                        )
                    )

        # Pair off all the solar array and battery packs
        for this_pack in pack_combos:
            for this_array in array_combos:
                all_systems.append(
                    SolarSystem(
                        this_cont.lib_id,
                        this_pack.batt_id,
                        this_pack.batt_ser_qty,
                        this_pack.batt_par_qty,
                        this_pack.batt_v,
                        this_pack.batt_cap,
                        this_array.solar_id,
                        this_array.solar_ser_qty,
                        this_array.solar_par_qty,
                        this_array.solar_v,
                        this_array.solar_p,
                        this_array.solar_nop,
                    )
                )

    return remove_invalid_systems(all_systems, solar_lib, battery_lib, controller_lib)


def get_solar_arrays(
    solar: SolarPanel, ser_qty: int, controller_power: float
) -> List[SolarArray]:
    """This function creates all of the solar array configurations possible
        with a provided solar panel, series configuration and power limitation.

    This function calculates the maximim number of series solar panel strings
    possible with the solar controller power limit.  It then iterates over each
    parallel combination to create solar arrays.  It returns all of the solar
    array configurations up to and including the configuration that goes beyond
    the power limit.  This final configuration will be limited by the controller,
    but is included as it may provide a benefit over a configuration under the limit.

    Args:
        solar: SolarPanel. This is the specific solar panel being used to build
            this solar array.
        ser_qty: Int. This is the number of panels being connected in series in
            this solar array.
        controller_power: Float.  Maximum power rating for the solar controller
            being used.

    Returns:
        configs: List[SolarArray]. The function returns a list of SolarArrays
            using the provided solar panel, series configuration and within the
            controller power limit.
    """

    configs = []
    num_configs = math.ceil(controller_power / (solar.power_stc * ser_qty))

    for par_qty in range(1, num_configs + 1):
        configs.append(
            SolarArray(
                solar.lib_id,
                ser_qty,
                par_qty,
                ser_qty * solar.ocv,
                min(controller_power, ser_qty * par_qty * solar.power_stc),
                min(controller_power, ser_qty * par_qty * solar.power_notc),
            )
        )

    return configs


def get_battery_packs(
    battery: Battery, ser_qty: int, target_capacity: float
) -> List[BatteryPack]:
    """This function creates all of the battery pack configurations possible
        with a provided battery, series configuration and energy capacity target.

    This function calculates the minimum number of series battery strings needed
    to achieve the target pack capacity. It then iterates over each parallel
    combination to create battery packs.  It returns all of the battery pack
    configurations up to and including the configuration that goes beyond the
    energy capacity target.

    Args:
        battery: Battery. This is the specific battery being used to build
            this battery pack.
        ser_qty: Int. This is the number of batteries being connected in series
            in this battery pack.
        target_capacity: Float.  Maximum usable energy capacity (Whr) of the
            battery packs being created.

    Returns:
        configs: List[BatteryPack]. The function returns a list of BatteryPacks
            using the provided battery, series configuration and within the
            capacity target.
    """

    configs = []
    battery_usable_capacity = (
        battery.nom_cap * battery.nom_volt * (battery.max_doc / 100)
    )
    num_configs = math.ceil(target_capacity / (ser_qty * battery_usable_capacity))

    for par_qty in range(1, num_configs + 1):
        configs.append(
            BatteryPack(
                battery.lib_id,
                ser_qty,
                par_qty,
                ser_qty * battery.nom_volt,
                ser_qty * par_qty * battery_usable_capacity,
            )
        )

    return configs


def remove_invalid_systems(
    systems: List[SolarSystem],
    solar_lib: List[SolarPanel],
    battery_lib: List[Battery],
    controller_lib: List[SolarController],
) -> List[SolarSystem]:
    """This function takes a list of solar power system configurations and
    removes system configurations that are not valid because
    violate an operating limit on at least one element of the system.

    This function iterates through each power system configuration and validates
    interoperability constraints between subsystems.  Additional constraints can
    be added here without needing to restructure how configurations are
    initially created.  This function enforces the following constraints:
        1. Solar array output power is within the power limit of the controller
        2. Solar array power does not exceed the controllers output current
            limit at the battery system voltage

    Args:
        systems: List[SolarSystem]. List of SolarSystem items representing all
            possible system configurations from the library components.
        solar_lib: List[SolarPanel]. SolarPanel component library.
        battery_lib: List[Battery]. Battery component library.
        controller_lib: List[SolarController]. SolarController component library.

    Returns:
        valid_systems: List[SolarSystem]. The function returns a list of only
            the valid SolarSystems that are meet the operating limits of the
            battery pack, solar array and controller.
    """

    valid_systems = []
    valid = True

    for this_system in systems:
        # Look up the components in the libraries
        this_cont = next(
            (x for x in controller_lib if x.lib_id == this_system.solar_cont_id), None
        )
        """ Defined for future system constraints
        this_battery = next(
            (x for x in battery_lib if x.lib_id == this_system.batt_id),
            None
        )
        this_solar = next(
            (x for x in solar_lib if x.lib_id == this_system.solar_id),
            None
        )
        """
        controller_batt_index = this_cont.batt_volts.index(this_system.batt_v)

        # Solar array power can not exceed controller power limit
        valid = valid & (
            this_system.solar_p <= this_cont.max_powers[controller_batt_index]
        )

        # Battery current can not exceed controller output rating
        valid = valid & (
            (this_system.solar_p / this_system.batt_v) <= this_cont.max_batt_curr
        )

        if valid:
            valid_systems.append(this_system)

        valid = 1

    return valid_systems


def calc_historic_perf(
    site: Site,
    solar_flux: List[float],
    usable_capacity: float,
    power: float,
    data_period: dt.timedelta,
) -> Tuple(float, float):
    """This function calculates the performance of a generalized power system
    over a set of solar irradiance data.

    The power system is generalized as much as possible to a specific solar STC
    power and nominal battery pack capacity.  Using a series of solar
    irrandiance data, and assuming the site starts with a full battery, the
    function calculates the power balance and change in stored energy for each
    time step.

    The function currently uses a fixed load, though it can be exapanded to a
    ynamic load in future.  The load is converted to watt-hours based on the
    period of the series data.  A scalar is also computer to convert the
    irradiance data to energy, accounting for NOTC conditions and converter
    losses.

    The resulting power balance is applied to the battery pack at each time
    step, bounding the stored energy between 0 and the usuable_capcity of the
    battery pack.  For time steps in which the battery contained some energy,
    the system is considered to have had power available for the site.  For time
    steps where the battery had no stored energy, it is considered that the site
    had no power availability.

    The results of the function are an availability metric, which is the ratio
    of time steps with power system availability to total time steps, and the
    total energy drawn from the battery pack.  This value is used to calculate
    battery life based on actual usage.

    Args:
        site: Site. Deployment Site object used for electrical requirements and
            efficiencies.
        solar_flux: List[float].
        usable_capacity: float.
        power: float.  The average power load on the system.
        data_period: timedelta.  The time duration between data points in the
            solar irradiance data

    Returns:
        costc: List[float]. The function returns a list of systems costs,
            including capex and opex for that site location and corresponding to
            the list of power systems provided.
        """

    elapsed_years = len(solar_flux) * data_period.seconds / (60 * 60 * 24 * 365.25)
    period_hours = data_period.seconds / (60 * 60)
    load = -1 * site.continuous_power * period_hours
    system_scalar = site.solar_cont_eff * (power / 800) * period_hours

    power_balance = system_scalar * np.array(solar_flux) + load
    battery_energy_demand = []
    battery_energy_stored = []
    battery_energy_stored.append(usable_capacity)
    pos_data_pts = power_balance > 0
    battery_energy_demand = (
        (site.batt_charge_eff * pos_data_pts)
        + ((1 / site.batt_discharge_eff) * np.logical_not(pos_data_pts))
    ) * power_balance

    battery_energy_stored = 0 * battery_energy_demand

    for i in range(0, len(power_balance) - 1):
        battery_energy_stored[i + 1] = max(
            min(usable_capacity, battery_energy_stored[i] + battery_energy_demand[i]),
            -1,
        )
    batt_energy_change = np.diff(battery_energy_stored)
    battery_energy_used = abs(
        np.sum(batt_energy_change[batt_energy_change < 0]) / elapsed_years
    )

    total_availbility = np.sum(np.array(battery_energy_stored) >= 0) / (
        len(battery_energy_stored)
    )
    return total_availbility, battery_energy_used


def calc_cost(
    site_combos: List[SolarSystem],
    site: Site,
    solar_library: List[SolarPanel],
    battery_library: List[Battery],
    controller_library: List[SolarController],
) -> List[float]:
    """This function calculates the cost of each power system configuration for
    a given site.

    This function iterates through each power system configuration and
    calculates the lieftime cost of the system.  It uses site infomration to
    calculate fixed costs, and components information to calculate capex and
    opex costs.  The system performance is used to determine the number of
    battery packs used at the site and determine replacement costs.

    Args:
        site_combos: List[SolarSystem]. List of SolarSystem items for which to
            calculate the system cost.
        site: Site. Deployment Site object used for cost information.
        solar_lib: List[SolarPanel]. SolarPanel component library used for cost
            and life information.
        battery_lib: List[Battery]. Battery component library used for cost
            and life information.
        controller_lib: List[SolarController]. SolarController component library
             used for cost and life information.

    Returns:
        cost: List[float]. The function returns a list of systems costs,
            including capex and opex for that site location and corresponding to
            the list of power systems provided.
        """

    # FIX: should site visits should be compared to num of batt packs and adjusted?
    lifetime = site.lifetime
    fixed_cost = site.misc_cost + (
        np.ceil(lifetime * site.num_maint_visit) * site.cost_maint_visit
    )
    solar_lib_ids = []
    batt_lib_ids = []
    cont_lib_ids = []
    for comp in solar_library:
        solar_lib_ids.append(comp.lib_id)
    for comp in battery_library:
        batt_lib_ids.append(comp.lib_id)
    for comp in controller_library:
        cont_lib_ids.append(comp.lib_id)
    # for each site_combos, the index in to library that has component with correct ID
    batt_index = [batt_lib_ids.index(i.batt_id) for i in site_combos]
    solar_index = [solar_lib_ids.index(i.solar_id) for i in site_combos]
    cont_index = [cont_lib_ids.index(i.solar_cont_id) for i in site_combos]

    costs = []
    for i in range(0, len(site_combos)):
        solar_cost = (
            np.ceil(lifetime / solar_library[solar_index[i]].life)
            * solar_library[solar_index[i]].cost
            * site_combos[i].solar_ser_qty
            * site_combos[i].solar_par_qty
        )
        num_batt_per_pack = site_combos[i].batt_ser_qty * site_combos[i].batt_par_qty
        battery_i = battery_library[batt_index[i]]
        pack_usable_cap = (
            num_batt_per_pack
            * battery_i.nom_cap
            * battery_i.nom_volt
            * (battery_i.max_doc / 100)
        )
        num_pack_per_year = site_combos[i].batt_e / (
            pack_usable_cap * battery_i.cycle_life
        )
        battery_cost = (
            np.ceil(site.lifetime * num_pack_per_year)
            * num_batt_per_pack
            * battery_i.cost
        )
        solar_cont_cost = (
            np.ceil(lifetime / controller_library[cont_index[i]].life)
            * controller_library[cont_index[i]].cost
        )
        costs.append(solar_cost + battery_cost + solar_cont_cost + fixed_cost)

    return costs


def get_optimal_solar_system(
    site: Site,
    solar_library: List[SolarPanel],
    battery_library: List[Battery],
    controller_library: List[SolarController],
) -> Tuple(SolarSystem, float):
    """This function finds the least expensive solar battery system given the
    customer's site, library of components and minimum acceptable power
    availability.

    This function creates all of the possible power system congirations using
    the available components.  It then loads the historic solar data for the
    site location, and evaluates each site for historical power availability.
    All of the system configurations that were above the availability target are
    then evaluated for cost over the lifetime specified in the site constraints.

    The least expensive option is returned as the optimal solution.

    Args:
        site: Site. Deployment Site object used for site location, power system
            efficiencies and cost information
        solar_library: List[SolarPanel]. SolarPanel component library used for
        cost and life information.
        battery_library: List[Battery]. Battery component library used for cost
            and life information.
        controller_library: List[SolarController]. SolarController component
        library used for cost and life information.

    Returns:
        (system): SolarSystem. The function returns the SolarSystem that
            represents the least expensive system that achieves the required
            power availability
        min_cost: float. The function returns the estiamted cost of the optimal
            system over the lifetime specified in the site data
        """

    all_site_systems = get_site_solar_systems(
        solar_library, battery_library, controller_library, site.target_capacity
    )
    batt_solar_pairs = []
    for this_system in all_site_systems:
        batt_solar_pairs.append(
            [this_system.batt_id, this_system.batt_cap, this_system.solar_nop]
        )
    # Performance can be computed based on total solar power and battery energy.
    # All combinations are reduced to these two parameters.
    # ac is an index map from the reduced set to the complete list of systems
    unique_batt_solar_pairs, _ai, ac = np.unique(
        batt_solar_pairs, return_index=True, return_inverse=True, axis=0
    )

    # Need to replace this in ANP with a different data collection mechanism
    (
        historic_time_delta,
        historic_data_flux,
        site.panel_slope,
        site.panel_azimuth,
    ) = query_solar_data("/mnt/public/jconnors/SolarDatLat-29Long27.5.csv")

    historic_availability = []
    historic_energy = []
    for this_pair in unique_batt_solar_pairs:
        this_availability, this_energy = calc_historic_perf(
            site, historic_data_flux, this_pair[1], this_pair[2], historic_time_delta
        )
        historic_availability.append(this_availability)
        historic_energy.append(this_energy)

    systems_above_thresh_index = np.where(
        np.array(historic_availability)[ac] > site.target_availability
    )[0]
    for i in systems_above_thresh_index:
        all_site_systems[i].avail = historic_availability[ac[i]]
        all_site_systems[i].batt_e = historic_energy[ac[i]]
    costs = calc_cost(
        [all_site_systems[i] for i in systems_above_thresh_index],
        site,
        solar_library,
        battery_library,
        controller_library,
    )
    min_cost = min(costs)
    min_cost_index = systems_above_thresh_index[costs.index(min_cost)]

    return all_site_systems[min_cost_index], min_cost


def query_solar_data(solar_file):
    """
    THIS IS JUST FOR INITIAL USE PENDING INTEGRATION WITH ANP AND A MORE ROBUST
    WAY TO DEAL WITH THE UNDERLYING DATASET
    """
    with open(solar_file) as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=",")
        row_count = 0
        date_time = []
        InPlaneSolarFlux_W_m2 = []
        for row in csv_reader:
            if not row:
                row_count += 1
                continue
            if row_count == 6:
                temp = row[0]
                slope = float(temp[temp.find(": ") + 2: temp.find(" deg")])
            elif row_count == 7:
                temp = row[0]
                azimuth = float(temp[temp.find(": ") + 2: temp.find(" deg")])
            else:
                try:
                    date_time.append(dt.datetime.strptime(row[0], "%Y%m%d:%H%M"))
                    InPlaneSolarFlux_W_m2.append(float(row[1]))
                except ValueError:  # catches lines that are not data
                    pass
            row_count += 1
    time_delta = np.mean(np.diff(date_time))
    return time_delta, InPlaneSolarFlux_W_m2, slope, azimuth
