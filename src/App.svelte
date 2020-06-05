<script>
  import Tailwindcss from "./Tailwindcss.svelte";

  let currentGoal = 6969;
  let totalRaised = 420;

  let initialGoal = 100;
  let showOriginalGoal = false;

  $: chartHeight = getChartHeight();
  $: totalRaisedHeight = (totalRaised / currentGoal) * 100;
  $: originalGoalPosition = (1 - initialGoal / currentGoal) * 100;
  $: totalRaisedPosition = (1 - totalRaised / currentGoal) * 100;

  function getChartHeight() {
    if (totalRaised <= currentGoal) return 100;
    else if (totalRaised > currentGoal) {
      return 100;
    }
  }

  function toDollars(num) {
    if (!num) return "$0";

    let dollaString = num.toString();
    return `$${dollaString.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")}`;
  }
</script>

<style>
  :root {
    --main-bg: #0a0d30;
    --brand: #0d1fbf;
    --brand-shade: #081693;
    --highlight: #50e9cd;
    --highlight-shade: #1a91a5;
    --bright: hotpink;

    --foreground: #fff;
    --foreground-fade: rgba(223, 235, 255, 0.45);
  }

  #Container {
    height: 100%;
    width: 100%;
    font-family: Consolas, monaco, monospace;
  }
  #View {
    background: var(--main-bg);
  }

  #Chart {
    background: repeating-linear-gradient(
      -45deg,
      var(--brand),
      var(--brand) 10px,
      var(--brand-shade) 10px,
      var(--brand-shade) 20px
    );
    color: var(--foreground);

    position: relative;
    border: 20px solid #000;
    border-radius: 10px;
    width: 60%;
    margin-left: 40%;
  }
  #ChartTotalRaisedBar {
    background: var(--highlight);
    border-top: 8px solid #d9eb9a;
    position: absolute;
    width: 100%;
    bottom: 0;
    transition: height 500ms cubic-bezier(0.075, 0.82, 0.165, 1);
  }

  .chartLabel {
    width: 100%;
    bottom: 0;
    position: absolute;
    color: var(--highlight-shade);
    
  }

  .chartLabel > strong {
    display: block;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }

  .chartLabelLine {
    border-top: 4px solid var(--brand);
    height: 30px;
    line-height: 30px;
    position: absolute;
    top: 0;
    width: 100%;
    z-index: 100;
  }

  .chartLabelLine.dashed {
    border-top: 3px dashed var(--brand);
  }

  .chartLabelLine > span {
    color: var(--foreground);
    font-weight: bold;
    width: 500px;
    position: relative;
    right: 500px;
    top: -15px;
    padding-right: 0.5em;
    text-align: right;
    display: block;
  }

  .chartLabelLine > span > strong {
    background: var(--highlight);
    color: #fff;
    color: rgba(0,0,0,0.8);
    padding: 0.25em 1em;
    border-radius: 1em;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }


  .chartLabelLine.dashed > span > strong {
    background: var(--brand);
    color: var(--foreground);
  }

  .chartLabelLine.alt > span > strong {
    background: var(--bright);
    color: var(--foreground);
  }


  input {
    padding: 0.5em;
  }

  /*   

  @media (min-width: 640px) {
    #Container {
      max-width: none;
    }
  } */
</style>

<Tailwindcss />

<main id="Container" class="flex">
  <div id="Controls" class="flex-1 p-2">
    <div class="flex items-center py-4">
      <label class="pr-2" for="currentGoalInput">Current Goal:</label>
      <input type="number" id="currentGoalInput" bind:value={currentGoal} />
    </div>
    <div class="flex items-center py-4">
      <label class="pr-2" for="totalRaisedInput">Raised so far:</label>
      <input type="number" id="totalRaisedInput" bind:value={totalRaised} />
    </div>

    <hr />

    <div class="flex items-center py-4">
      <label class="pr-2" for="initialGoalInput">Original Goal:</label>
      <input type="number" id="initialGoalInput" bind:value={initialGoal} />
    </div>

    <div class="flex items-center py-4">
      Show original goal line?
      <input
        id="showOriginalGoal"
        type="checkbox"
        bind:checked={showOriginalGoal} />
    </div>
  </div>
  <!-- 
  ///////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////
  -->
  <div id="View" class="flex-1 p-10">
    <!-- {initialGoal} {currentGoal} {totalRaised} -->
    <div id="Chart" class="h-full" style={`height: ${chartHeight}%`}>
      <div class="chartLabelLine alt">
        <span>
          Current goal:
          <strong>{toDollars(currentGoal)}</strong>
        </span>
      </div>
      {#if showOriginalGoal}
        <div
          class="chartLabelLine absolute dashed"
          style={`top: ${originalGoalPosition}%;`}>
          <span>
            Original goal:
            <strong>{toDollars(initialGoal)}</strong>
          </span>
        </div>
      {/if}

      <div
        class="chartLabelLine absolute"
        style={`top: ${totalRaisedPosition}%;`}>
        <span>
          Total raised:
          <strong>{toDollars(totalRaised)}</strong>
        </span>
      </div>
      <div id="ChartTotalRaisedBar" style={`height: ${totalRaisedHeight}%`}>
        <span class="chartLabel text-center">
          <strong class="text-5xl high">{toDollars(totalRaised)} raised</strong>
        </span>
      </div>
    </div>
  </div>

</main>
