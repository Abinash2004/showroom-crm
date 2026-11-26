/**
 * Layout for the horizontal chip rows on the lead and follow-up lists.
 * Phones: the row bleeds to the screen edges and scrolls sideways.
 * From 768px: the row sits inside the content column and the chips share its full width equally,
 * so the rows line up with the search + branch row above them.
 */
export const CHIP_SCROLLER = "chip-row -mx-4 overflow-x-auto py-1 pl-4 md:mx-0 md:overflow-visible md:pl-0";
export const CHIP_LIST = "flex w-max gap-2.5 pr-4 md:w-full md:pr-0";
export const CHIP_ITEM = "shrink-0 md:min-w-0 md:flex-1 md:[&>*]:w-full md:[&>*]:justify-center";
